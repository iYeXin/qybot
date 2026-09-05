/** 图片渲染（浏览器）配置 */
export interface BrowserConfig {
  /** 优先尝试的浏览器通道，如 'chrome' / 'msedge'，留空自动探测 */
  channel?: string | string[];
  /** 指定浏览器可执行文件路径，优先级最高 */
  executablePath?: string;
  /** 浏览器空闲关闭时间（毫秒），默认 30000 */
  idleTimeout?: number;
  /** 启动超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/** 网关行为配置 */
export interface GatewayConfig {
  /** 心跳超时（毫秒），默认心跳间隔 + 5s */
  heartbeatTimeoutMs?: number;
  /** 重连基础延迟（毫秒），默认 3000 */
  reconnectDelayMs?: number;
  /** 最大重连延迟（毫秒），默认 60000 */
  maxReconnectDelayMs?: number;
  /** 是否打印完整事件内容，默认 false */
  debugPayload?: boolean;
}

/** 机器人配置（src/config.ts） */
export interface BotConfig {
  /** 开放平台 AppId */
  appId: string;
  /** 开放平台 AppSecret */
  secret: string;
  /** 接口域名，默认 https://api.bot.qq.com */
  apiBase?: string;
  /**
   * 事件订阅 intents
   * - 不填：框架根据插件注册的事件自动计算
   * - 数字：直接使用该位掩码
   * - 字符串数组：如 ['GROUP_AND_C2C_EVENT', 'INTERACTION']
   */
  intents?: number | string[];
  /** 分片 [当前分片, 总分片数]，默认 [0, 1] */
  shard?: [number, number];
  /** 网关行为 */
  gateway?: GatewayConfig;
  /** 图片渲染 */
  browser?: BrowserConfig;
}
