import { botConfig } from '../config.ts';
import { logger } from '../core/logger.ts';
import { httpFetch } from './client.ts';
import { QQApiError } from './errors.ts';

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: string | number;
  err_code?: number;
  message?: string;
  trace_id?: string;
}

/** access_token 生命周期兜底值（秒） */
const DEFAULT_EXPIRES_IN = 7200;

/**
 * access_token 管理器
 *
 * - 自动获取并在有效期内复用
 * - 提前 `refreshAdvanceMs` 主动刷新（平台在到期前 60 秒内才返回新 token）
 * - 并发调用共享同一次刷新请求
 */
export class TokenManager {
  private token: string | null = null;
  private expiresAt = 0;
  private refreshing: Promise<string> | null = null;

  private readonly options: {
    appId?: string;
    clientSecret?: string;
    baseUrl?: string;
    /** 提前多少毫秒刷新，默认 5 分钟 */
    refreshAdvanceMs?: number;
  };

  constructor(
    options: {
      appId?: string;
      clientSecret?: string;
      baseUrl?: string;
      refreshAdvanceMs?: number;
    } = {}
  ) {
    this.options = options;
  }

  /** 提前刷新窗口（毫秒），默认 5 分钟 */
  private get refreshAdvanceMs(): number {
    return this.options.refreshAdvanceMs ?? 5 * 60 * 1000;
  }

  /** 获取可用的 access_token（到期前提前刷新） */
  async get(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.expiresAt - this.refreshAdvanceMs) {
      return this.token;
    }

    // 并发场景下复用同一次刷新
    if (this.refreshing) return await this.refreshing;

    this.refreshing = this.refresh().finally(() => {
      this.refreshing = null;
    });

    return await this.refreshing;
  }

  /** 强制刷新并返回新 token */
  async refresh(): Promise<string> {
    const appId = this.options.appId ?? botConfig.appId;
    const clientSecret = this.options.clientSecret ?? botConfig.secret;
    const baseUrl = (this.options.baseUrl ?? botConfig.apiBase ?? 'https://api.bot.qq.com').replace(
      /\/$/,
      ''
    );

    if (!appId || !clientSecret || appId === 'xxxxx') {
      throw new Error('未配置 appId / secret，请在 src/config.ts 中填写机器人票据');
    }

    let response: Response;
    try {
      response = await httpFetch(
        `${baseUrl}/app/getAppAccessToken`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, clientSecret }),
        },
        10000
      );
    } catch (error) {
      throw new Error(`获取 access_token 失败: ${(error as Error).message}`);
    }

    const text = await response.text();
    const data = this.parse(text);

    if (!response.ok || (data && typeof data === 'object' && 'err_code' in data)) {
      const code = Number((data as AccessTokenResponse | undefined)?.err_code ?? response.status);
      if (code !== 0) {
        throw new QQApiError(
          String((data as AccessTokenResponse | undefined)?.message ?? '获取 access_token 失败'),
          {
            code,
            status: response.status,
            traceId: (data as AccessTokenResponse | undefined)?.trace_id,
            payload: data ?? text,
          }
        );
      }
    }

    const token = (data as AccessTokenResponse | undefined)?.access_token;
    if (!token) {
      throw new Error(`获取 access_token 失败：响应缺少 access_token（${text.slice(0, 200)}）`);
    }

    const raw = Number((data as AccessTokenResponse).expires_in);
    const expiresIn = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EXPIRES_IN;

    this.token = token;
    this.expiresAt = Date.now() + expiresIn * 1000;

    logger.info('TOKEN', `获取 access_token 成功，有效期 ${expiresIn} 秒`);
    return token;
  }

  /** 当前 token 是否已获取（不触发刷新） */
  hasToken(): boolean {
    return Boolean(this.token) && Date.now() < this.expiresAt;
  }

  private parse(text: string): AccessTokenResponse | string {
    if (!text) return text;
    try {
      return JSON.parse(text) as AccessTokenResponse;
    } catch {
      return text;
    }
  }
}
