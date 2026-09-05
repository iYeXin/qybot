/** OpenAPI 调用失败时抛出的错误 */
export class QQApiError extends Error {
  /** 业务错误码（err_code），0 表示成功 */
  readonly code: number;
  /** HTTP 状态码 */
  readonly status: number;
  /** 平台链路追踪 ID，反馈问题时需提供 */
  readonly traceId?: string;
  /** 原始响应体（可能为字符串或对象） */
  readonly payload?: unknown;

  constructor(
    message: string,
    options: { code: number; status: number; traceId?: string; payload?: unknown }
  ) {
    super(message);
    this.name = 'QQApiError';
    this.code = options.code;
    this.status = options.status;
    this.traceId = options.traceId;
    this.payload = options.payload;
  }

  /** 是否为频率限制错误 */
  get isRateLimited(): boolean {
    return this.status === 429 || this.code === 100001 || this.code === 1100100;
  }

  /** 是否为鉴权相关错误（可尝试刷新 token 后重试） */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === 11241 || this.code === 11242 || this.code === 11243;
  }

  override toString(): string {
    const parts = [`QQApiError(${this.code})`, this.message];
    if (this.traceId) parts.push(`trace_id=${this.traceId}`);
    return parts.join(' | ');
  }
}

/** 网关（WebSocket）错误码对应的处理建议 */
export type GatewayRecovery = 'resume' | 'identify' | 'fatal';

/** 网关错误码表：值 -> 含义与恢复方式 */
export const GATEWAY_ERRORS: Record<number, { message: string; recovery: GatewayRecovery }> = {
  4001: { message: '无效的 opcode', recovery: 'identify' },
  4002: { message: '无效的 payload', recovery: 'identify' },
  4006: { message: '无效的 session id，无法继续 resume', recovery: 'identify' },
  4007: { message: 'seq 错误', recovery: 'identify' },
  4008: { message: '发送 payload 过快，请遵守频控信息', recovery: 'resume' },
  4009: { message: '连接过期，请重连并 resume', recovery: 'resume' },
  4010: { message: '无效的 shard', recovery: 'identify' },
  4011: { message: '连接需要处理的频道过多，请合理分片', recovery: 'identify' },
  4012: { message: '无效的 version', recovery: 'identify' },
  4013: { message: '无效的 intent', recovery: 'identify' },
  4014: { message: 'intent 无权限，请检查机器人已申请的事件权限', recovery: 'identify' },
  4914: { message: '机器人已下架，只允许连接沙箱环境', recovery: 'fatal' },
  4915: { message: '机器人已封禁，不允许连接', recovery: 'fatal' },
};

/** 查询网关错误码含义（4900~4913 为内部错误） */
export function describeGatewayError(code: number): { message: string; recovery: GatewayRecovery } {
  if (GATEWAY_ERRORS[code]) return GATEWAY_ERRORS[code];
  if (code >= 4900 && code <= 4913) {
    return { message: '网关内部错误，请重连', recovery: 'identify' };
  }
  return { message: `未知网关错误 ${code}`, recovery: 'identify' };
}
