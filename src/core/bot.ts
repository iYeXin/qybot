import WebSocket from 'ws';
import {
  botSendImageMessage,
  botSendMessage,
  getAccessToken,
  getWsLink,
  sendPrivateImageMessage,
  sendPrivateMessage,
  uploadImage,
  uploadImageForPrivate,
} from '../api/qq.ts';
import { img2Url } from '../image/upload.ts';
import { closeBrowserPool } from '../image/browser.ts';
import { logger } from './logger.ts';
import { PluginManager } from './plugin-manager.ts';
import type {
  IncomingMessage,
  PluginContext,
  PluginResult,
  PluginResultObject,
} from '../types/index.ts';

/** 连接重置周期：1 小时 */
const RESET_INTERVAL = 60 * 60 * 1000;

/** WebSocket 收到的消息体 */
interface WsEvent {
  op: number;
  t?: string;
  s?: number;
  d?: {
    content?: string;
    id?: string;
    group_openid?: string;
    author?: { id?: string };
    heartbeat_interval?: number;
    session_id?: string;
  };
}

/** QQ 机器人主类 */
export class QQBot {
  private heartbeatInterval = 0;
  private expiresIn = 0;
  private sessionId: string | null = null;
  private seq = 0;
  private restoreLink = false;
  private accessToken: string | null = null;
  private isConnecting = false;
  private isShuttingDown = false;

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private connectionResetTimer: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;

  private readonly pluginManager: PluginManager;

  constructor(context: PluginContext) {
    this.pluginManager = new PluginManager(context);

    process.on('uncaughtException', (error: Error) => {
      logger.error('CRASH', `未捕获异常: ${error.stack ?? error.message}`);
      this.safeResetConnection();
    });
  }

  /** 注册进程退出信号（由入口调用） */
  registerSignals(): void {
    process.on('SIGINT', () => void this.shutdown());
    process.on('SIGTERM', () => void this.shutdown());
  }

  /** 安全关闭 */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('BOT', '开始关闭机器人...');

    this.cleanupResources();
    await this.pluginManager.cleanup();
    this.pluginManager.stopWatching();
    await closeBrowserPool();

    logger.info('BOT', '机器人已安全关闭');
    process.exit(0);
  }

  /** 初始化：加载插件 + 建立连接 */
  async init(): Promise<void> {
    if (this.isConnecting) {
      logger.warn('BOT', '连接已在进行中，跳过重复连接');
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('BOT', '开始初始化机器人...');

      await this.pluginManager.loadPlugins();
      this.pluginManager.startWatching();

      await this.setupConnection();
      this.scheduleConnectionReset();

      logger.info('BOT', '机器人初始化完成');
    } catch (error) {
      logger.error('BOT', `初始化失败: ${(error as Error).message}`);
      this.safeResetConnection(5000);
    } finally {
      this.isConnecting = false;
    }
  }

  /** 建立 WebSocket 连接 */
  private async setupConnection(): Promise<void> {
    await this.anewGetAccessToken();
    const wsLinkData = await getWsLink(this.accessToken ?? '');
    logger.info('WS', `获取WS链接: ${wsLinkData.url}`);

    // 关闭现有连接
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket(wsLinkData.url);
    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data: WebSocket.RawData) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error: Error) => this.handleError(error));
  }

  /** 连接建立：发送鉴权或恢复会话 */
  private handleOpen(): void {
    logger.info('WS', '连接成功');

    if (this.restoreLink) {
      logger.debug('WS', `发送恢复连接请求 seq: ${this.seq + 1}`);
      this.ws?.send(
        JSON.stringify({
          op: 6,
          d: { token: `QQBot ${this.accessToken}`, session_id: this.sessionId, seq: this.seq + 1 },
        })
      );
      this.restoreLink = false;
      return;
    }

    this.sendSession(`QQBot ${this.accessToken}`);
  }

  /** 处理收到的消息 */
  private handleMessage(data: WebSocket.RawData): void {
    try {
      const ev = JSON.parse(data.toString()) as WsEvent;

      logger.debug(
        'WS',
        `收到消息: ${JSON.stringify({
          op: ev.op,
          t: ev.t,
          s: ev.s,
          d: ev.d
            ? {
                heartbeat_interval: ev.d.heartbeat_interval,
                session_id: ev.d.session_id,
                content: ev.d.content ? `${ev.d.content.substring(0, 50)}...` : undefined,
              }
            : undefined,
        })}`
      );

      if (ev.d?.content) {
        void this.processMessages(
          ev.d.content,
          ev.d.id ?? '',
          ev.d.group_openid ?? '',
          ev.d.author?.id ?? ''
        );
      }

      if (ev.d?.heartbeat_interval) {
        this.heartbeatInterval = ev.d.heartbeat_interval;
        logger.debug('WS', `设置心跳周期: ${this.heartbeatInterval}ms`);
      }

      if (ev.s) {
        this.seq = ev.s;
        logger.debug('WS', `更新序列号: ${this.seq}`);
      }

      if (ev.t === 'READY') {
        this.sessionId = ev.d?.session_id ?? null;
        logger.info('WS', `获取Session ID: ${this.sessionId}`);
        this.sendHeartbeat();
      }

      // 重连指令
      if (ev.op === 7 || ev.op === 9) {
        logger.info('WS', '收到重连指令');
        this.safeResetConnection();
      }
    } catch (error) {
      logger.error('WS', '消息解析失败:', error);
    }
  }

  private handleClose(): void {
    logger.warn('WS', '连接关闭，尝试重连...');
    this.safeResetConnection(3000);
  }

  private handleError(error: Error): void {
    logger.error('WS', `连接错误: ${error.message}`);
    this.safeResetConnection(5000);
  }

  /** 安全重置连接 */
  private safeResetConnection(delay = 0): void {
    if (this.isShuttingDown) return;

    logger.warn('BOT', `安全重置连接${delay ? ` (${delay}ms后)` : ''}`);
    this.cleanupResources();

    setTimeout(() => {
      this.restoreLink = true;
      this.init().catch((error: Error) => {
        logger.error('BOT', `重连失败: ${error.message}`);
        this.safeResetConnection(10000);
      });
    }, delay);
  }

  /** 清理定时器与连接 */
  private cleanupResources(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.connectionResetTimer) {
      clearTimeout(this.connectionResetTimer);
      this.connectionResetTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
      this.ws = null;
    }
  }

  /** 定期重置连接 */
  private scheduleConnectionReset(): void {
    this.connectionResetTimer = setTimeout(() => {
      logger.info('BOT', '定期连接重置');
      this.safeResetConnection();
    }, RESET_INTERVAL);

    logger.debug('BOT', `已安排 ${RESET_INTERVAL / 60000} 分钟后重置连接`);
  }

  /** 开始发送心跳 */
  private sendHeartbeat(): void {
    this.ws?.send(JSON.stringify({ op: 1, d: null }));
    logger.debug('HEARTBEAT', '发送首次心跳');

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.ws?.send(JSON.stringify({ op: 1, d: this.seq }));
      logger.debug('HEARTBEAT', `发送心跳 (seq: ${this.seq})`);
    }, this.heartbeatInterval);
  }

  /** 发送鉴权 */
  private sendSession(token: string): void {
    logger.debug('AUTH', '发送鉴权请求');
    this.ws?.send(
      JSON.stringify({
        op: 2,
        d: {
          token,
          intents: 0 | (1 << 25),
          shard: [0, 1],
          properties: {},
        },
      })
    );
  }

  /** 获取（并定时刷新）访问令牌 */
  private async anewGetAccessToken(): Promise<void> {
    try {
      logger.info('TOKEN', '获取访问令牌...');
      const data = await getAccessToken();

      if (!data?.access_token) {
        throw new Error('获取Token失败：响应中缺少 access_token');
      }

      this.accessToken = data.access_token;

      // 接口未提供有效有效期时使用 2 小时兜底，避免 NaN 导致的立即重试风暴
      const expiresIn = Number(data.expires_in);
      const valid = Number.isFinite(expiresIn) && expiresIn > 0;

      this.expiresIn = valid ? expiresIn * 1000 : 7200 * 1000;
      if (!valid) logger.warn('TOKEN', '响应未提供有效有效期，使用默认值 7200 秒');

      logger.info('TOKEN', '获取Token成功');
      logger.debug('TOKEN', `有效期: ${Math.floor(this.expiresIn / 1000)}秒`);

      if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);

      const refreshTime = this.expiresIn - 60000; // 提前 1 分钟刷新
      this.tokenRefreshTimer = setTimeout(() => {
        logger.info('TOKEN', '刷新访问令牌');
        void this.anewGetAccessToken();
      }, refreshTime);

      logger.debug('TOKEN', `安排 ${Math.floor(refreshTime / 1000)} 秒后刷新令牌`);
    } catch (error) {
      logger.error('TOKEN', `获取Token失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /** 解析并分发消息，随后回复 */
  private async processMessages(
    msg: string,
    id: string,
    groupId: string,
    senderOpenid: string
  ): Promise<void> {
    try {
      const isPrivate = !groupId;
      logger.info(
        'MSG',
        `收到 [${isPrivate ? '私聊' : '群聊'}] 消息 [${senderOpenid}]: ${msg.substring(0, 50)}${
          msg.length > 50 ? '...' : ''
        }`
      );

      const content = msg.replace(/^\s+/, '').trim();

      if (!content) {
        logger.warn('MSG', '无法解析消息格式');
        return;
      }

      const incoming: IncomingMessage = {
        content,
        text: content,
        messageId: id,
        groupId: groupId || undefined,
        senderId: senderOpenid,
        isPrivate,
      };

      const retMsg = await this.pluginManager.dispatchMessage(incoming);

      if (!retMsg) return;
      await this.sendReply(retMsg, { id, groupId, senderOpenid, isPrivate });
    } catch (error) {
      logger.error('MSG', `消息处理失败: ${(error as Error).message}`);
    }
  }

  /** 回复消息（文本 / 图文） */
  private async sendReply(
    retMsg: PluginResult,
    target: { id: string; groupId: string; senderOpenid: string; isPrivate: boolean }
  ): Promise<void> {
    const { id, groupId, senderOpenid, isPrivate } = target;
    const token = this.accessToken ?? '';

    // 旧版插件：直接返回字符串
    if (typeof retMsg === 'string') {
      if (!retMsg.trim()) return;
      if (isPrivate) {
        await sendPrivateMessage(token, retMsg, id, senderOpenid);
        logger.info('MSG', '发送私聊文本回复');
      } else {
        await botSendMessage(token, retMsg, id, groupId);
        logger.info('MSG', '发送群聊文本回复');
      }
      return;
    }

    const result = retMsg as PluginResultObject;

    // 新版插件：文本 + 图片
    if (result.image) {
      const url = typeof result.image === 'string' ? result.image : await img2Url(result.image);
      logger.debug('IMG', '图片URL获取成功');

      if (isPrivate) {
        const fileinfo = await uploadImageForPrivate(token, url, senderOpenid);
        logger.debug('IMG', '私聊图片fileinfo获取成功');
        await sendPrivateImageMessage(token, result.text ?? '', fileinfo, id, senderOpenid);
        logger.info('MSG', '发送私聊图片回复');
      } else {
        const fileinfo = await uploadImage(token, url, groupId);
        logger.debug('IMG', '群聊图片fileinfo获取成功');
        await botSendImageMessage(token, result.text ?? '', fileinfo, id, groupId);
        logger.info('MSG', '发送群聊图片回复');
      }
      return;
    }

    if (result.text) {
      if (isPrivate) {
        await sendPrivateMessage(token, result.text, id, senderOpenid);
        logger.info('MSG', '发送私聊文本回复');
      } else {
        await botSendMessage(token, result.text, id, groupId);
        logger.info('MSG', '发送群聊文本回复');
      }
    }
  }
}
