import { botConfig } from '../config.ts';
import { QQApi, TokenManager } from '../api/index.ts';
import { intentsForEvents, resolveIntents } from './intents.ts';
import { createGatewayUrlFetcher, Gateway, type GatewayEvent } from './gateway.ts';
import { HandlerRegistry, type MatchResult } from './registry.ts';
import { logger } from './logger.ts';
import { PluginManager } from './plugin-manager.ts';
import type { MessageTarget } from '../api/message.ts';
import type {
  EventContext,
  InteractionContext,
  InteractionEventData,
  MessageContent,
  MessageContext,
  MessageEventData,
  SentMessage,
} from '../types/index.ts';

/** 被动回复次数上限（群聊 5 次 / 单聊 4 次） */
const REPLY_LIMIT: Record<string, number> = { group: 5, user: 4 };

/** msg_seq 记录的清理周期 */
const SEQ_TTL = 60 * 60 * 1000;

/** 支持用 event_id 被动回复的事件 */
const REPLYABLE_EVENTS = new Set([
  'INTERACTION_CREATE',
  'GROUP_ADD_ROBOT',
  'GROUP_MSG_RECEIVE',
  'C2C_MSG_RECEIVE',
  'FRIEND_ADD',
]);

/** QQ 机器人主类：插件加载 + 网关事件分发 + 消息收发 */
export class QQBot {
  readonly api: QQApi;
  private readonly token: TokenManager;
  private readonly registry = new HandlerRegistry();
  private readonly pluginManager: PluginManager;
  private readonly seqMap = new Map<string, { count: number; at: number }>();
  private gateway: Gateway | null = null;
  private isShuttingDown = false;
  private lastIntents: number | null = null;

  constructor() {
    this.token = new TokenManager();
    this.api = new QQApi(this.token);
    this.pluginManager = new PluginManager(this.registry, this.api, undefined, {
      onReloaded: () => this.handlePluginsReloaded(),
    });
  }

  /** 注册退出信号 */
  registerSignals(): void {
    process.on('SIGINT', () => void this.shutdown());
    process.on('SIGTERM', () => void this.shutdown());
  }

  /** 启动：加载插件 -> 连接网关 */
  async start(): Promise<void> {
    await this.pluginManager.loadPlugins();
    this.pluginManager.startWatching();
    this.lastIntents = this.currentIntents();

    this.gateway = new Gateway({
      tokenProvider: () => this.token.get(),
      fetchGatewayUrl: createGatewayUrlFetcher(this.api.client),
      getIntents: () => this.currentIntents(),
      onEvent: (event) => void this.handleEvent(event),
      onFatal: (message) => {
        logger.error('BOT', `网关不可恢复错误：${message}`);
        process.exit(1);
      },
    });

    await this.gateway.connect();
  }

  /** 安全关闭 */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('BOT', '开始关闭机器人...');
    this.gateway?.close();
    this.pluginManager.stopWatching();
    await this.pluginManager.cleanup();

    logger.info('BOT', '机器人已安全关闭');
    process.exit(0);
  }

  /** 当前 intents：配置优先，否则按插件注册的事件自动计算 */
  private currentIntents(): number {
    const configured = resolveIntents(botConfig.intents);
    if (configured !== undefined) return configured;

    const events = this.registry.requiredEvents();
    const computed = intentsForEvents(events);
    logger.debug('BOT', `自动计算 intents=${computed} (${events.join(', ') || '无注册事件'})`);
    return computed;
  }

  /** 插件热重载后：订阅变化时重新鉴权，使新 intents 生效 */
  private handlePluginsReloaded(): void {
    const next = this.currentIntents();
    if (this.gateway && this.lastIntents !== null && next !== this.lastIntents) {
      logger.info('BOT', `事件订阅变化（${this.lastIntents} -> ${next}），重新鉴权`);
      this.gateway.reidentify();
    }
    this.lastIntents = next;
  }

  /** 处理网关事件 */
  private async handleEvent(event: GatewayEvent): Promise<void> {
    const type = event.t;
    if (!type) return;

    try {
      switch (type) {
        case 'GROUP_AT_MESSAGE_CREATE':
          await this.handleMessage('at', event);
          break;
        case 'GROUP_MESSAGE_CREATE':
          await this.handleMessage('group', event);
          break;
        case 'C2C_MESSAGE_CREATE':
          await this.handleMessage('c2c', event);
          break;
        case 'INTERACTION_CREATE':
          await this.handleInteraction(event);
          break;
        default:
          await this.handleGenericEvent(type, event);
          break;
      }
    } catch (error) {
      logger.error('BOT', `事件 ${type} 处理失败: ${(error as Error).message}`);
    }
  }

  /** 处理消息事件 */
  private async handleMessage(
    kind: 'at' | 'group' | 'c2c',
    event: GatewayEvent
  ): Promise<void> {
    const data = (event.d ?? {}) as MessageEventData;
    const content = (data.content ?? '').trim();
    // 纯图片/卡片/引用消息可能没有文本，但带有附件或结构化数据，仍需分发
    const hasPayload =
      content !== '' ||
      (data.attachments?.length ?? 0) > 0 ||
      data.ark_data !== undefined ||
      (data.msg_elements?.length ?? 0) > 0;
    if (!hasPayload) return;

    const isGroup = kind !== 'c2c';
    logger.info(
      'MSG',
      `收到 [${isGroup ? (kind === 'at' ? '群@' : '群消息') : '单聊'}] ${
        data.group_openid ?? data.author?.id ?? '-'
      }: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`
    );

    await this.registry.dispatchMessage(kind, content, data.group_openid, (extra) =>
      this.createMessageContext(event.t ?? '', data, extra, event.id)
    );
  }

  /** 处理互动事件 */
  private async handleInteraction(event: GatewayEvent): Promise<void> {
    const data = (event.d ?? {}) as InteractionEventData;
    const interactionId = data.id;
    if (!interactionId) return;

    logger.info('MSG', `收到互动事件 type=${data.type} scene=${data.scene}`);

    let responded = false;
    const context = this.createInteractionContext(
      data,
      event.id,
      () => {
        responded = true;
      },
      () => responded
    );

    await this.registry.dispatchInteraction(data.type, () => context);

    // 按钮回调(type=11)与快捷菜单(type=12)必须回应，否则客户端一直 loading
    const needsResponse = data.type === 11 || data.type === 12;
    if (needsResponse && !responded) {
      await this.api.message.respondInteraction(interactionId).catch((error: Error) => {
        logger.warn('MSG', `互动回应失败: ${error.message}`);
      });
    }
  }

  /** 处理其它事件 */
  private async handleGenericEvent(type: string, event: GatewayEvent): Promise<void> {
    logger.debug('EVENT', `${type} -> ${JSON.stringify(event.d ?? {})}`);
    await this.registry.dispatchEvent(type, () => this.createEventContext(type, event));
  }

  /** 构造消息上下文 */
  private createMessageContext(
    event: string,
    data: MessageEventData,
    extra: MatchResult,
    eventId?: string
  ): MessageContext {
    const isGroup = event !== 'C2C_MESSAGE_CREATE';
    const groupOpenid = data.group_openid;
    const memberOpenid = data.author?.member_openid ?? (isGroup ? data.author?.id : undefined);
    const userOpenid = data.author?.user_openid ?? (isGroup ? undefined : data.author?.id);
    const targetId = isGroup ? groupOpenid : userOpenid;

    const target: MessageTarget = {
      scene: isGroup ? 'group' : 'user',
      id: targetId ?? '',
    };

    const canReply = Boolean(target.id);

    return {
      event,
      content: (data.content ?? '').trim(),
      text: extra.text,
      ...(extra.match ? { match: extra.match } : {}),
      ...(extra.prefix ? { prefix: extra.prefix } : {}),
      ...(data.id ? { messageId: data.id } : {}),
      ...(eventId ? { eventId } : {}),
      ...(groupOpenid ? { groupOpenid } : {}),
      senderId: (isGroup ? memberOpenid : userOpenid) ?? data.author?.id ?? '',
      ...(userOpenid ? { userOpenid } : {}),
      ...(memberOpenid ? { memberOpenid } : {}),
      ...(data.author?.username ? { nickname: data.author.username } : {}),
      ...(data.author?.member_role ? { memberRole: data.author.member_role } : {}),
      isGroup,
      isPrivate: !isGroup,
      ...(data.timestamp ? { timestamp: data.timestamp } : {}),
      ...(data.message_type !== undefined ? { messageType: data.message_type } : {}),
      ...(data.message_scene ? { messageScene: data.message_scene } : {}),
      ...(data.attachments ? { attachments: data.attachments } : {}),
      ...(data.mentions ? { mentions: data.mentions } : {}),
      ...(data.ark_data ? { arkData: data.ark_data } : {}),
      ...(data.msg_elements ? { msgElements: data.msg_elements } : {}),
      raw: data,

      reply: (content: MessageContent): Promise<SentMessage[]> =>
        canReply ? this.replyTo(target, content, data.id) : Promise.resolve([]),
      send: (content: MessageContent): Promise<SentMessage[]> =>
        canReply ? this.api.message.send(target, content) : Promise.resolve([]),
      api: this.api,
      logger,
    };
  }

  /** 构造事件上下文 */
  private createEventContext(type: string, event: GatewayEvent): EventContext {
    const data = event.d ?? {};
    const target = this.eventTarget(data);

    return {
      event: type,
      ...(event.id ? { eventId: event.id } : {}),
      data,
      ...(this.eventTimestamp(data) !== undefined ? { timestamp: this.eventTimestamp(data) } : {}),
      ...(target && REPLYABLE_EVENTS.has(type)
        ? { reply: (content: MessageContent) => this.replyEvent(target, content, event.id) }
        : {}),
      api: this.api,
      logger,
    };
  }

  /** 构造互动上下文 */
  private createInteractionContext(
    data: InteractionEventData,
    eventId: string | undefined,
    markResponded: () => void,
    isResponded: () => boolean
  ): InteractionContext {
    const interactionId = data.id ?? '';
    const isGroup = data.scene === 'group';
    const target: MessageTarget | undefined =
      data.group_openid || data.user_openid
        ? {
            scene: isGroup ? 'group' : 'user',
            id: (isGroup ? data.group_openid : data.user_openid) ?? '',
          }
        : undefined;

    return {
      id: interactionId,
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.scene ? { scene: data.scene } : {}),
      ...(data.chat_type !== undefined ? { chatType: data.chat_type } : {}),
      ...(data.data?.resolved?.button_data ? { buttonData: data.data.resolved.button_data } : {}),
      ...(data.data?.resolved?.button_id ? { buttonId: data.data.resolved.button_id } : {}),
      ...(data.data?.resolved?.message_id ? { messageId: data.data.resolved.message_id } : {}),
      ...(data.group_openid ? { groupOpenid: data.group_openid } : {}),
      ...(data.user_openid ? { userOpenid: data.user_openid } : {}),
      ...(data.group_member_openid ? { memberOpenid: data.group_member_openid } : {}),
      ...(data.guild_id ? { guildId: data.guild_id } : {}),
      ...(data.channel_id ? { channelId: data.channel_id } : {}),
      ...(data.timestamp ? { timestamp: data.timestamp } : {}),
      ...(eventId ? { eventId } : {}),
      raw: data,

      respond: async (code = 0): Promise<void> => {
        // 同一 interaction_id 只能回应一次；多处理器场景下重复调用直接跳过
        if (isResponded()) {
          logger.debug('MSG', `互动 ${interactionId} 已回应，跳过重复回应`);
          return;
        }
        markResponded();
        await this.api.message.respondInteraction(interactionId, code);
      },
      reply: (content: MessageContent): Promise<SentMessage[]> =>
        target ? this.replyEvent(target, content, eventId) : Promise.resolve([]),
      api: this.api,
      logger,
    };
  }

  /**
   * 被动回复消息（自动维护 msg_seq，拆条时后续各条自动递增并预占序号）
   * 同一条消息的被动回复次数超限后，自动降级为主动消息发出。
   */
  private async replyTo(
    target: MessageTarget,
    content: MessageContent,
    messageId?: string
  ): Promise<SentMessage[]> {
    if (!messageId) return await this.api.message.send(target, content);

    const limit = REPLY_LIMIT[target.scene] ?? 5;
    const key = `msg:${messageId}`;
    if (this.peekSeq(key) > limit) {
      logger.info('MSG', `被动回复次数已达上限（${limit} 次），转为主动消息发送`);
      return await this.api.message.send(target, content);
    }

    const seq = this.nextSeq(key);
    const results = await this.api.message.send(target, content, { msgId: messageId, seq });
    // 文本+图片等拆条发送占用了多个序号，预占避免下一次复用导致去重失败
    if (results.length > 1) {
      this.seqMap.set(key, { count: seq + results.length - 1, at: Date.now() });
    }
    return results;
  }

  /**
   * 用事件 ID 被动回复（自动维护 msg_seq，超限后自动降级为主动消息）
   */
  private replyEvent(
    target: MessageTarget,
    content: MessageContent,
    eventId?: string
  ): Promise<SentMessage[]> {
    if (!eventId) return this.api.message.send(target, content);

    const limit = REPLY_LIMIT[target.scene] ?? 5;
    const key = `evt:${eventId}`;
    if (this.peekSeq(key) > limit) {
      logger.info('MSG', `事件被动回复次数已达上限（${limit} 次），转为主动消息发送`);
      return this.api.message.send(target, content);
    }

    const seq = this.nextSeq(key);
    return this.api.message.send(target, content, { eventId, seq });
  }

  /** 查看下一个 msg_seq（不推进计数器） */
  private peekSeq(key: string): number {
    this.pruneSeq();
    return (this.seqMap.get(key)?.count ?? 0) + 1;
  }

  /** 递增并返回 msg_seq */
  private nextSeq(key: string): number {
    this.pruneSeq();
    const record = this.seqMap.get(key);
    const count = (record?.count ?? 0) + 1;
    this.seqMap.set(key, { count, at: Date.now() });
    return count;
  }

  /** 清理过期的 msg_seq 记录 */
  private pruneSeq(): void {
    if (this.seqMap.size < 500) return;
    const now = Date.now();
    for (const [key, value] of this.seqMap) {
      if (now - value.at > SEQ_TTL) this.seqMap.delete(key);
    }
  }

  /** 从事件数据推断回复目标 */
  private eventTarget(data: unknown): MessageTarget | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const payload = data as Record<string, unknown>;

    const groupOpenid = typeof payload.group_openid === 'string' ? payload.group_openid : undefined;
    if (groupOpenid) return { scene: 'group', id: groupOpenid };

    const openid = typeof payload.openid === 'string' ? payload.openid : undefined;
    if (openid) return { scene: 'user', id: openid };

    return undefined;
  }

  private eventTimestamp(data: unknown): string | number | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const value = (data as Record<string, unknown>).timestamp;
    return typeof value === 'string' || typeof value === 'number' ? value : undefined;
  }
}
