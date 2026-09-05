import { botConfig } from '../config.ts';
import { logger } from '../core/logger.ts';
import { QQApiError } from './errors.ts';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method: HttpMethod;
  /** 以 / 开头的接口路径，如 `/v2/groups/{group_openid}/messages` */
  path: string;
  /** JSON 请求体 */
  body?: unknown;
  /** query 参数，值为 undefined 时会被忽略 */
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** 单次请求超时（毫秒），默认 15000 */
  timeout?: number;
  /** 是否自动重试（默认 true，网络错误 / 429 / 5xx 时退避重试） */
  retry?: boolean;
}

export interface RawResponse {
  status: number;
  headers: Headers;
  text: string;
  json: <T = unknown>() => T;
}

/** 带超时的 fetch */
export async function httpFetch(url: string, init: RequestInit, timeout = 15000): Promise<Response> {
  return await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
}

/** 构建带 query 的 URL */
function buildUrl(base: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, `${base.replace(/\/$/, '')}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** 读取响应中的 trace_id（响应头优先，其次响应体） */
function readTraceId(headers: Headers, json: unknown): string | undefined {
  const headerTrace = headers.get('X-Tps-trace-ID') ?? headers.get('x-tps-trace-id');
  if (headerTrace) return headerTrace;

  if (json && typeof json === 'object' && 'trace_id' in json) {
    const value = (json as { trace_id?: unknown }).trace_id;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * QQ 开放平台 OpenAPI 客户端
 *
 * - 统一域名 https://api.bot.qq.com
 * - 自动注入 `Authorization: QQBot {access_token}`
 * - 统一解析 err_code / trace_id，失败时抛出 QQApiError
 * - 网络错误 / 429 / 5xx 自动退避重试，鉴权失效时刷新 token 后重试一次
 */
export class ApiClient {
  private readonly tokenProvider: (force?: boolean) => Promise<string>;
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;

  constructor(options: {
    tokenProvider: (force?: boolean) => Promise<string>;
    baseUrl?: string;
    defaultTimeout?: number;
    maxRetries?: number;
  }) {
    this.tokenProvider = options.tokenProvider;
    this.baseUrl = options.baseUrl ?? botConfig.apiBase ?? 'https://api.bot.qq.com';
    this.defaultTimeout = options.defaultTimeout ?? 15000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  /** 发起请求并解析业务数据 */
  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const { retry = true } = options;
    let lastError: unknown;
    let refreshed = false;

    for (let attempt = 0; attempt <= (retry ? this.maxRetries : 0); attempt++) {
      if (attempt > 0) await sleep(Math.min(2000, 300 * 2 ** (attempt - 1)));

      let response: Response;
      try {
        const token = await this.tokenProvider();
        const url = buildUrl(this.baseUrl, options.path, options.query);

        response = await httpFetch(
          url,
          {
            method: options.method,
            headers: {
              Authorization: `QQBot ${token}`,
              ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
              ...options.headers,
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          },
          options.timeout ?? this.defaultTimeout
        );
      } catch (error) {
        lastError = error;
        logger.warn('API', `请求异常（第 ${attempt + 1} 次）: ${(error as Error).message}`);
        continue;
      }

      const text = await response.text();
      const json = this.parseJson(text);
      const traceId = readTraceId(response.headers, json);

      // 鉴权失败：刷新 token 后重试一次
      if ((response.status === 401 || this.isAuthFailure(json)) && !refreshed) {
        refreshed = true;
        logger.warn('API', '鉴权失效，刷新 access_token 后重试');
        await this.tokenProvider(true);
        continue;
      }

      if (response.ok) {
        // 成功时响应体直接是业务数据；若带 err_code 且非 0 仍视为失败
        if (json && typeof json === 'object' && 'err_code' in json) {
          const code = Number((json as { err_code: unknown }).err_code);
          if (code !== 0) {
            throw new QQApiError(
              String((json as { message?: unknown }).message ?? '接口调用失败'),
              { code, status: response.status, traceId, payload: json }
            );
          }
        }
        return json as T;
      }

      const code = this.readErrCode(json) ?? response.status;
      const message = String((json as { message?: unknown } | undefined)?.message ?? response.statusText);
      const apiError = new QQApiError(message || `HTTP ${response.status}`, {
        code,
        status: response.status,
        traceId,
        payload: json ?? text,
      });

      // 频率限制与服务端错误可重试
      if (retry && attempt < this.maxRetries && (apiError.isRateLimited || response.status >= 500)) {
        lastError = apiError;
        logger.warn('API', `请求失败（第 ${attempt + 1} 次）: ${apiError.toString()}`);
        continue;
      }

      throw apiError;
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`请求失败: ${String(lastError)}`);
  }

  /** 返回原始响应（用于下载等非 JSON 场景） */
  async requestRaw(options: RequestOptions): Promise<RawResponse> {
    const token = await this.tokenProvider();
    const url = buildUrl(this.baseUrl, options.path, options.query);

    const response = await httpFetch(
      url,
      {
        method: options.method,
        headers: {
          Authorization: `QQBot ${token}`,
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
      options.timeout ?? this.defaultTimeout
    );

    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      json: <T = unknown>(): T => JSON.parse(text) as T,
    };
  }

  get<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>({ method: 'GET', path, query });
  }

  post<T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>({ method: 'POST', path, body, query });
  }

  put<T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body, query });
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: 'DELETE', path, body });
  }

  private isAuthFailure(json: unknown): boolean {
    if (!json || typeof json !== 'object' || !('err_code' in json)) return false;
    const code = Number((json as { err_code: unknown }).err_code);
    return code === 11241 || code === 11242 || code === 11243;
  }

  private readErrCode(json: unknown): number | undefined {
    if (!json || typeof json !== 'object' || !('err_code' in json)) return undefined;
    const code = Number((json as { err_code: unknown }).err_code);
    return Number.isFinite(code) ? code : undefined;
  }

  private parseJson(text: string): unknown {
    if (!text) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
