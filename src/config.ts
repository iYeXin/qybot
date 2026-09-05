import type { BotConfig } from './types/index.ts';

/**
 * 机器人配置
 *
 * 在 [QQ 开放平台](https://q.qq.com/) 创建机器人后，把 AppId / AppSecret 填入下方即可。
 */
export const botConfig: BotConfig = {
  appId: 'xxxxx',
  secret: 'xxxxx',

  /** 开放平台接口域名（2026/08/10 起统一为 api.bot.qq.com） */
  apiBase: 'https://api.bot.qq.com',

  /**
   * 事件订阅 intents
   * - 不填（默认）：框架根据插件实际注册的事件自动计算所需 intents
   * - 填数字：直接使用该位掩码
   * - 填字符串数组：如 ['GROUP_AND_C2C_EVENT', 'INTERACTION']
   */
  intents: undefined,

  /** 分片配置 [当前分片, 总分片数]，默认 [0, 1] */
  shard: [0, 1],

  /** 网关行为配置 */
  gateway: {
    /** 心跳超时（毫秒）：超过该时间未收到 ACK 则重连，默认心跳间隔 + 5s */
    heartbeatTimeoutMs: undefined,
    /** 重连基础延迟（毫秒），默认 3000 */
    reconnectDelayMs: 3000,
    /** 最大重连延迟（毫秒），默认 60000 */
    maxReconnectDelayMs: 60000,
    /** 是否打印完整事件内容（调试用），默认 false */
    debugPayload: false,
  },

  /** 图片渲染（浏览器）配置 */
  browser: {
    // 留空表示自动探测系统自带的 Chrome / Edge
    channel: [],
    executablePath: '',
    idleTimeout: 30000,
    timeout: 30000,
  },
};

/** 框架版本 */
export const VERSION = '3.0.0';
