import axios from 'axios';
import { logger } from '../core/logger.ts';

/**
 * 统一的 Axios 实例
 * - 60s 超时
 * - 不在插件/业务层暴露 HTTP 细节，统一在此处理错误
 */
const service = axios.create({
  timeout: 60000,
  validateStatus: (status: number): boolean => status >= 200 && status < 500, // 接受 400-499 以便读取错误信息
});

// 请求拦截器：处理数据编码
service.interceptors.request.use(
  (config) => {
    if (config.headers['Content-Type'] === 'application/x-www-form-urlencoded' && config.data) {
      config.data = new URLSearchParams(
        config.data as Record<string, string>
      ).toString();
    }

    if (
      config.headers['Content-Type'] === 'application/json' &&
      typeof config.data === 'object' &&
      config.data !== null
    ) {
      config.data = JSON.stringify(config.data);
    }

    return config;
  },
  (error: unknown) => {
    logger.error('HTTP', '请求配置错误:', error);
    return Promise.reject(new Error(`请求配置错误: ${(error as Error).message}`));
  }
);

// 响应拦截器：统一错误处理
service.interceptors.response.use(
  (response) => {
    if (response.status >= 400) {
      const errorData = response.data ? JSON.stringify(response.data) : '无响应数据';
      return Promise.reject(
        new Error(`请求失败: ${response.status} ${response.statusText} | ${errorData}`)
      );
    }
    return response.data;
  },
  (error: unknown) => {
    const err = error as {
      response?: { status: number };
      request?: unknown;
      message?: string;
    };
    let errorMessage = '网络请求异常';
    if (err.response) errorMessage = `服务响应异常: ${err.response.status}`;
    else if (err.request) errorMessage = '无服务响应';

    logger.error('HTTP', errorMessage, err);
    return Promise.reject(new Error(`${errorMessage} | ${err.message ?? ''}`));
  }
);

/** 基础请求方法（内部使用） */
export function request<T = unknown>(config: {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...config.headers };
  return service({ ...config, headers }) as Promise<T>;
}
