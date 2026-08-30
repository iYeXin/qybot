import type {
  HandlerRegistration,
  IncomingMessage,
  MessageScope,
  PluginResult,
} from '../types/index.ts';
import { logger } from './logger.ts';

/** 一条已注册的处理器（带作用域） */
interface RegisteredHandler extends HandlerRegistration {
  scope: MessageScope;
}

/** 作用域是否匹配 */
function scopeMatches(scope: MessageScope, msg: IncomingMessage): boolean {
  if (scope === 'all') return true;
  return scope === 'private' ? msg.isPrivate : !msg.isPrivate;
}

/** 群白名单是否匹配 */
function groupMatches(groupId: string | string[] | undefined, msg: IncomingMessage): boolean {
  if (!groupId) return true;
  if (!msg.groupId) return false;
  return Array.isArray(groupId) ? groupId.includes(msg.groupId) : groupId === msg.groupId;
}

/**
 * api: 2 插件的消息处理器注册中心
 *
 * 分发规则：按注册顺序依次执行，第一个返回非 null 结果的处理器生效，
 * 返回 null / undefined / 空字符串的处理器不会阻断后续处理器。
 */
export class HandlerRegistry {
  private handlers: RegisteredHandler[] = [];
  private unloadCallbacks: Array<() => void | Promise<void>> = [];

  /** 注册处理器 */
  add(scope: MessageScope, registration: HandlerRegistration): void {
    this.handlers.push({ ...registration, scope });
  }

  /** 注册卸载回调 */
  onUnload(callback: () => void | Promise<void>): void {
    this.unloadCallbacks.push(callback);
  }

  /** 清空所有处理器 */
  clearHandlers(): void {
    this.handlers = [];
  }

  /** 执行所有卸载回调 */
  async runUnloadCallbacks(): Promise<void> {
    const callbacks = this.unloadCallbacks;
    this.unloadCallbacks = [];

    for (const callback of callbacks) {
      try {
        await callback();
      } catch {
        // 卸载阶段忽略异常
      }
    }
  }

  /** 分发消息，返回第一个非空结果 */
  async dispatch(msg: IncomingMessage): Promise<PluginResult> {
    for (const entry of this.handlers) {
      if (!scopeMatches(entry.scope, msg)) continue;
      if (!groupMatches(entry.groupId, msg)) continue;

      const matched = this.matchMessage(entry, msg);
      if (!matched) continue;

      let result: PluginResult;
      try {
        result = await entry.handler({ ...msg, ...matched });
      } catch (error) {
        logger.error('PLUGIN', '消息处理器执行失败:', error);
        continue;
      }

      if (result !== null && result !== undefined && result !== '') return result;
    }
    return null;
  }

  /** 计算匹配结果，未命中返回 null */
  private matchMessage(
    entry: RegisteredHandler,
    msg: IncomingMessage
  ): Pick<IncomingMessage, 'text' | 'match' | 'prefix'> | null {
    const content = msg.content;

    // 正则匹配
    if (entry.match) {
      const match = entry.match.exec(content);
      if (!match) return null;
      return { text: content, match };
    }

    // 前缀匹配
    if (entry.prefix) {
      if (!content.startsWith(entry.prefix)) return null;
      const text = content.slice(entry.prefix.length).trim();
      return { text, prefix: entry.prefix };
    }

    // 未声明匹配条件：接收该作用域的全部消息
    return { text: content };
  }
}
