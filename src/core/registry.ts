import { logger } from './logger.ts';
import type {
  EventContext,
  EventHandler,
  InteractionContext,
  InteractionHandler,
  InteractionHandlerOptions,
  MessageContent,
  MessageContext,
  MessageHandler,
  MessageHandlerOptions,
  MessageScope,
  SentMessage,
  UnloadCallback,
} from '../types/index.ts';

/** 消息类别（内部使用，'any' 表示全部） */
export type MessageKind = 'at' | 'group' | 'c2c';

/** 已注册的消息处理器（注册时已校验并归一化） */
interface MessageRegistration {
  kind: MessageKind | 'any';
  groups?: string[];
  match?: RegExp;
  prefixes?: string[];
  ignoreCase: boolean;
  handler: MessageHandler;
}

/** 已注册的事件处理器 */
interface EventRegistration {
  events: string[];
  handler: EventHandler;
}

/** 已注册的互动处理器 */
interface InteractionRegistration {
  types?: number[];
  handler: InteractionHandler;
}

/** 匹配结果 */
export interface MatchResult {
  text: string;
  match?: RegExpMatchArray;
  prefix?: string;
}

/**
 * 事件处理器注册中心
 *
 * 分发规则：按注册顺序执行所有命中的处理器，每个返回非空结果的处理器都会回复；
 * 返回 null / undefined / 空字符串的处理器不回复，也不阻断后续处理器。
 * 单个处理器的异常或发送失败只跳过该处理器，不影响其他处理器。
 */
export class HandlerRegistry {
  private messageHandlers: MessageRegistration[] = [];
  private eventHandlers: EventRegistration[] = [];
  private interactionHandlers: InteractionRegistration[] = [];
  private unloadCallbacks: UnloadCallback[] = [];

  /** 注册消息处理器（参数错误直接抛错，避免静默失效） */
  addMessage(scope: MessageScope, options: MessageHandlerOptions): void {
    if (typeof options?.handler !== 'function') {
      throw new Error('onMessage 缺少 handler 函数');
    }
    if (options.prefix !== undefined && options.match !== undefined) {
      throw new Error('onMessage 的 prefix 与 match 互斥，只能二选一');
    }

    const groups =
      options.groups === undefined
        ? undefined
        : (Array.isArray(options.groups) ? options.groups : [options.groups]);
    if (groups !== undefined && groups.length === 0) {
      throw new Error('onMessage 的 groups 为空数组，处理器将永远不会触发');
    }

    let prefixes: string[] | undefined;
    if (options.prefix !== undefined) {
      prefixes = Array.isArray(options.prefix) ? options.prefix : [options.prefix];
      if (prefixes.length === 0 || prefixes.some((prefix) => prefix === '')) {
        throw new Error('onMessage 的 prefix 不能为空（字符串或非空数组）');
      }
    }

    this.messageHandlers.push({
      kind: scope === 'all' ? 'any' : scope,
      ...(groups ? { groups } : {}),
      ...(options.match ? { match: options.match } : {}),
      ...(prefixes ? { prefixes } : {}),
      ignoreCase: options.ignoreCase ?? false,
      handler: options.handler,
    });
  }

  /** 注册事件处理器 */
  addEvent(events: string[], handler: EventHandler): void {
    if (typeof handler !== 'function') {
      throw new Error('on 缺少 handler 函数');
    }
    const names = events.map((name) => name.toUpperCase()).filter((name) => name !== '');
    if (names.length === 0) {
      throw new Error('on 的事件名不能为空');
    }
    this.eventHandlers.push({ events: names, handler });
  }

  /** 注册互动处理器 */
  addInteraction(options: InteractionHandlerOptions): void {
    if (typeof options?.handler !== 'function') {
      throw new Error('onInteraction 缺少 handler 函数');
    }
    const types =
      options.type === undefined ? undefined : Array.isArray(options.type) ? options.type : [options.type];
    this.interactionHandlers.push({ handler: options.handler, ...(types ? { types } : {}) });
  }

  /** 注册卸载回调 */
  onUnload(callback: UnloadCallback): void {
    this.unloadCallbacks.push(callback);
  }

  /** 清空全部处理器（插件重载时调用） */
  clear(): void {
    this.messageHandlers = [];
    this.eventHandlers = [];
    this.interactionHandlers = [];
  }

  /** 执行全部卸载回调 */
  async runUnloadCallbacks(): Promise<void> {
    const callbacks = this.unloadCallbacks;
    this.unloadCallbacks = [];

    for (const callback of callbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error('PLUGIN', '卸载回调执行失败:', error);
      }
    }
  }

  /** 当前注册所依赖的事件（用于自动计算 intents） */
  requiredEvents(): string[] {
    const events = new Set<string>();

    for (const item of this.messageHandlers) {
      if (item.kind === 'at' || item.kind === 'any') events.add('GROUP_AT_MESSAGE_CREATE');
      if (item.kind === 'group' || item.kind === 'any') events.add('GROUP_MESSAGE_CREATE');
      if (item.kind === 'c2c' || item.kind === 'any') events.add('C2C_MESSAGE_CREATE');
    }

    for (const item of this.eventHandlers) {
      for (const name of item.events) events.add(name);
    }

    if (this.interactionHandlers.length > 0) events.add('INTERACTION_CREATE');

    return [...events];
  }

  /** 分发消息：所有命中的处理器都会回复，返回成功发送的处理器数 */
  async dispatchMessage(
    kind: MessageKind,
    content: string,
    groupOpenid: string | undefined,
    createContext: (extra: MatchResult) => MessageContext
  ): Promise<number> {
    let sentCount = 0;

    for (const item of this.messageHandlers) {
      if (item.kind !== 'any' && item.kind !== kind) continue;
      if (!this.groupMatches(item.groups, groupOpenid)) continue;

      const matched = this.match(content, item);
      if (!matched) continue;

      const context = createContext(matched);
      let result: unknown;
      try {
        result = await item.handler(context);
      } catch (error) {
        logger.error('PLUGIN', `${kind} 消息处理器执行失败:`, error);
        continue;
      }

      if (this.isEmpty(result)) continue;
      // 处理器返回内容时自动回复本条消息
      let sent: SentMessage[] = [];
      try {
        sent = await context.reply(result as MessageContent);
      } catch (error) {
        logger.error('PLUGIN', `${kind} 消息处理器回复失败:`, error);
        continue;
      }
      if (sent.length === 0) {
        logger.warn('PLUGIN', `${kind} 消息处理器返回了内容，但未能实际发送`);
        continue;
      }
      sentCount++;
    }
    return sentCount;
  }

  /** 分发通用事件：所有命中的处理器都会回复，返回成功发送的处理器数 */
  async dispatchEvent(event: string, createContext: () => EventContext): Promise<number> {
    const name = event.toUpperCase();
    let sentCount = 0;

    for (const item of this.eventHandlers) {
      if (!item.events.includes(name)) continue;

      const context = createContext();
      let result: unknown;
      try {
        result = await item.handler(context);
      } catch (error) {
        logger.error('PLUGIN', `${name} 事件处理器执行失败:`, error);
        continue;
      }

      if (this.isEmpty(result)) continue;
      if (!context.reply) {
        logger.warn('PLUGIN', `${name} 事件不支持回复，处理器返回值已被忽略`);
        continue;
      }
      let sent: SentMessage[] = [];
      try {
        sent = await context.reply(result as MessageContent);
      } catch (error) {
        logger.error('PLUGIN', `${name} 事件处理器回复失败:`, error);
        continue;
      }
      if (sent.length === 0) {
        logger.warn('PLUGIN', `${name} 事件处理器返回了内容，但未能实际发送`);
        continue;
      }
      sentCount++;
    }
    return sentCount;
  }

  /** 分发互动事件：所有命中的处理器都会回复，返回成功发送的处理器数 */
  async dispatchInteraction(
    type: number | undefined,
    createContext: () => InteractionContext
  ): Promise<number> {
    let sentCount = 0;

    for (const item of this.interactionHandlers) {
      if (item.types && type !== undefined && !item.types.includes(type)) continue;

      const context = createContext();
      let result: unknown;
      try {
        result = await item.handler(context);
      } catch (error) {
        logger.error('PLUGIN', '互动处理器执行失败:', error);
        continue;
      }

      if (this.isEmpty(result)) continue;
      let sent: SentMessage[] = [];
      try {
        sent = await context.reply(result as MessageContent);
      } catch (error) {
        logger.error('PLUGIN', '互动处理器回复失败:', error);
        continue;
      }
      if (sent.length === 0) {
        logger.warn('PLUGIN', '互动处理器返回了内容，但未能实际发送');
        continue;
      }
      sentCount++;
    }
    return sentCount;
  }

  /** 群白名单匹配 */
  private groupMatches(groups: string[] | undefined, groupOpenid?: string): boolean {
    if (!groups) return true;
    if (!groupOpenid) return false;
    return groups.includes(groupOpenid);
  }

  /** 计算 prefix / match 匹配结果 */
  private match(content: string, item: MessageRegistration): MatchResult | null {
    if (item.match) {
      // 带 g/y 标志的正则 exec 是有状态的，每次匹配前复位，避免轮询漏匹配
      item.match.lastIndex = 0;
      const match = item.match.exec(content);
      if (!match) return null;
      return { text: content, match };
    }

    if (item.prefixes) {
      const source = item.ignoreCase ? content.toLowerCase() : content;
      for (const prefix of item.prefixes) {
        const expected = item.ignoreCase ? prefix.toLowerCase() : prefix;
        if (source.startsWith(expected)) {
          return { text: content.slice(prefix.length).trim(), prefix };
        }
      }
      return null;
    }

    return { text: content };
  }

  /** 结果是否为空（不产生回复） */
  private isEmpty(result: unknown): boolean {
    return result === null || result === undefined || result === '';
  }
}
