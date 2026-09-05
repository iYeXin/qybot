import WebSocket from 'ws';
import { botConfig } from '../config.ts';
import { ApiClient } from '../api/client.ts';
import { describeGatewayError } from '../api/errors.ts';
import { logger } from './logger.ts';

/** 网关下行事件 */
export interface GatewayEvent {
  id?: string;
  op: number;
  d?: unknown;
  s?: number;
  t?: string;
}

/** 网关鉴权成功后下发的会话信息 */
interface ReadyData {
  version?: number;
  session_id?: string;
  user?: { id?: string; username?: string; bot?: boolean };
  shard?: [number, number];
}

/** Hello 消息内容 */
interface HelloData {
  heartbeat_interval?: number;
}

export interface GatewayOptions {
  /** 获取 access_token */
  tokenProvider: () => Promise<string>;
  /** 获取网关地址（GET /gateway/bot） */
  fetchGatewayUrl: () => Promise<string>;
  /** 动态获取 intents（插件注册变化后会重新计算） */
  getIntents: () => number;
  /** 分片 [当前分片, 总分片数] */
  shard?: [number, number];
  /** 收到 op 0 事件 */
  onEvent: (event: GatewayEvent) => void;
  /** 网关出现不可恢复错误（如机器人被封禁） */
  onFatal?: (message: string) => void;
}

/** 心跳超时容忍时间（毫秒）：心跳间隔 + 该值 */
const HEARTBEAT_TOLERANCE = 5000;

/**
 * WebSocket 网关客户端
 *
 * 负责：获取接入点 -> 连接 -> Identify 鉴权 -> 心跳 -> 断线 Resume/重连
 * 参考：https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html
 */
export class Gateway {
  private readonly options: GatewayOptions;
  private ws: WebSocket | null = null;

  private sessionId: string | null = null;
  private seq = 0;
  private heartbeatInterval = 45000;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatWatchdog: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private reconnectAttempts = 0;
  private shouldResume = false;
  private closed = false;
  private connecting = false;

  constructor(options: GatewayOptions) {
    this.options = options;
  }

  /** 建立连接（幂等） */
  async connect(): Promise<void> {
    if (this.closed || this.connecting) return;
    this.connecting = true;

    try {
      const url = await this.options.fetchGatewayUrl();
      const token = await this.options.tokenProvider();
      logger.info('GATEWAY', `连接网关: ${url}`);

      this.ws = new WebSocket(url);
      this.token = token;
      this.bind(this.ws);
    } catch (error) {
      this.connecting = false;
      logger.error('GATEWAY', `连接失败: ${(error as Error).message}`);
      this.scheduleReconnect();
    }
  }

  /** 当前连接使用的 token（连接建立时快照，供 Identify/Resume 使用） */
  private token = '';

  /**
   * 重新鉴权（插件热重载导致 intents 变化后调用，使新的事件订阅生效）
   */
  reidentify(): void {
    if (this.closed) return;
    logger.info('GATEWAY', '重新鉴权以应用新的事件订阅');
    this.shouldResume = false;
    this.sessionId = null;
    this.reconnect(0);
  }

  /** 主动关闭（不再重连） */
  close(): void {
    this.closed = true;
    this.clearTimers();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    logger.info('GATEWAY', '网关连接已关闭');
  }

  /** 绑定 WebSocket 事件 */
  private bind(ws: WebSocket): void {
    ws.on('open', () => {
      this.connecting = false;
      this.reconnectAttempts = 0;
      logger.info('GATEWAY', '网关连接成功');
    });

    ws.on('message', (data: WebSocket.RawData) => {
      this.handleMessage(data);
    });

    ws.on('error', (error: Error) => {
      logger.error('GATEWAY', `连接错误: ${error.message}`);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.connecting = false;
      this.stopHeartbeat();
      if (this.closed) return;

      const text = reason?.toString() || `code ${code}`;
      const { message, recovery } = describeGatewayError(code);
      logger.warn('GATEWAY', `连接关闭 (${text}): ${message}`);

      if (recovery === 'fatal') {
        this.closed = true;
        this.options.onFatal?.(message);
        return;
      }

      // 4006/4007/4013/4014 等无法继续 resume，需重新 identify
      this.shouldResume = recovery === 'resume' && Boolean(this.sessionId);
      if (!this.shouldResume) this.sessionId = null;

      this.scheduleReconnect();
    });
  }

  /** 处理网关下发的 payload */
  private handleMessage(data: WebSocket.RawData): void {
    let payload: GatewayEvent;
    try {
      payload = JSON.parse(data.toString()) as GatewayEvent;
    } catch {
      logger.error('GATEWAY', '无法解析网关消息');
      return;
    }

    if (typeof payload.s === 'number') this.seq = payload.s;

    switch (payload.op) {
      // Hello：记录心跳周期并鉴权
      case 10: {
        const hello = (payload.d ?? {}) as HelloData;
        if (hello.heartbeat_interval) {
          this.heartbeatInterval = hello.heartbeat_interval;
          logger.debug('GATEWAY', `心跳周期: ${this.heartbeatInterval}ms`);
        }
        this.identifyOrResume();
        break;
      }

      // Heartbeat ACK
      case 11: {
        logger.debug('GATEWAY', '心跳 ACK');
        this.armHeartbeatWatchdog();
        break;
      }

      // Reconnect：服务端要求重连
      case 7: {
        logger.info('GATEWAY', '收到重连指令');
        this.shouldResume = true;
        this.reconnect(0);
        break;
      }

      // Invalid Session：鉴权参数有误，重新 identify
      case 9: {
        logger.warn('GATEWAY', '会话失效，重新鉴权');
        this.sessionId = null;
        this.shouldResume = false;
        this.reconnect(0);
        break;
      }

      // Dispatch
      case 0: {
        this.handleDispatch(payload);
        break;
      }

      default:
        break;
    }
  }

  /** 处理 op 0 业务事件 */
  private handleDispatch(payload: GatewayEvent): void {
    if (payload.t === 'READY') {
      const ready = (payload.d ?? {}) as ReadyData;
      this.sessionId = ready.session_id ?? null;
      this.shouldResume = true;
      logger.info('GATEWAY', `鉴权成功 session=${this.sessionId ?? '-'}`);
      this.startHeartbeat();
      return;
    }

    if (payload.t === 'RESUMED') {
      logger.info('GATEWAY', '会话恢复完成，遗漏事件已补发');
      this.startHeartbeat();
      return;
    }

    if (botConfig.gateway?.debugPayload) {
      logger.debug('GATEWAY', `${payload.t ?? 'UNKNOWN'} -> ${JSON.stringify(payload.d)}`);
    }

    this.options.onEvent(payload);
  }

  /** 首次连接发送 Identify，断线重连发送 Resume */
  private identifyOrResume(): void {
    if (this.shouldResume && this.sessionId) {
      this.sendResume();
      return;
    }
    this.sendIdentify();
  }

  /** 发送鉴权 */
  private sendIdentify(): void {
    const intents = this.options.getIntents();
    const shard = this.options.shard ?? botConfig.shard ?? [0, 1];

    logger.debug('GATEWAY', `发送 Identify (intents=${intents}, shard=${shard.join('/')})`);
    this.send({
      op: 2,
      d: {
        token: `QQBot ${this.token}`,
        intents,
        shard,
        properties: { $os: process.platform, $browser: 'qybot', $device: 'qybot' },
      },
    });
  }

  /** 恢复会话 */
  private sendResume(): void {
    logger.debug('GATEWAY', `发送 Resume (seq=${this.seq})`);
    this.send({
      op: 6,
      d: { token: `QQBot ${this.token}`, session_id: this.sessionId, seq: this.seq },
    });
  }

  /** 启动心跳循环 */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // 首次心跳立即发送（d 为 null）
    this.send({ op: 1, d: null });
    this.armHeartbeatWatchdog();

    this.heartbeatTimer = setInterval(() => {
      this.send({ op: 1, d: this.seq });
      logger.debug('GATEWAY', `心跳 (seq=${this.seq})`);
    }, this.heartbeatInterval);
  }

  /** 心跳超时保护：超过容忍时间未收到 ACK 则重连 */
  private armHeartbeatWatchdog(): void {
    if (this.heartbeatWatchdog) clearTimeout(this.heartbeatWatchdog);

    const timeout =
      botConfig.gateway?.heartbeatTimeoutMs ?? this.heartbeatInterval + HEARTBEAT_TOLERANCE;

    this.heartbeatWatchdog = setTimeout(() => {
      logger.warn('GATEWAY', `心跳超时（${timeout}ms 未收到 ACK），重新连接`);
      this.shouldResume = Boolean(this.sessionId);
      this.reconnect(0);
    }, timeout);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatWatchdog) {
      clearTimeout(this.heartbeatWatchdog);
      this.heartbeatWatchdog = null;
    }
  }

  /** 安排重连（指数退避） */
  private scheduleReconnect(): void {
    const base = botConfig.gateway?.reconnectDelayMs ?? 3000;
    const max = botConfig.gateway?.maxReconnectDelayMs ?? 60000;
    const delay = Math.min(max, base * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnect(delay);
  }

  /** 延迟重连 */
  private reconnect(delay: number): void {
    if (this.closed || this.reconnectTimer) return;

    logger.info('GATEWAY', `${delay}ms 后重新连接`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.detach();
      void this.connect();
    }, delay);
  }

  /** 断开当前 socket 但不改变重连意图 */
  private detach(): void {
    if (!this.ws) return;
    this.ws.removeAllListeners();
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.ws = null;
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('GATEWAY', '连接不可用，丢弃待发送消息');
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * 创建默认的网关地址获取函数
 *
 * 固定使用 /gateway/bot（返回建议分片数与 Session 配额），与 config.shard 配合使用。
 * /gateway/bot 限频 2 QPM，连接时仅调用一次。
 */
export function createGatewayUrlFetcher(client: ApiClient): () => Promise<string> {
  return async (): Promise<string> => {
    const data = await client.get<{
      url?: string;
      shards?: number;
      session_start_limit?: { total?: number; remaining?: number; reset_after?: number; max_concurrency?: number };
    }>('/gateway/bot');

    if (!data?.url) throw new Error('未能获取网关地址');

    const limit = data.session_start_limit;
    if (limit) {
      logger.debug(
        'GATEWAY',
        `建议分片数=${data.shards ?? '-'} Session 配额=${limit.remaining ?? '-'}/${limit.total ?? '-'}`
      );
    }
    return data.url;
  };
}
