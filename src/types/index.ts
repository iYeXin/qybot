/**
 * QYbot 公共类型定义
 * 仅包含类型，运行时会被 Node 的类型剥离直接擦除
 */

/** 机器人配置 */
export interface BotConfig {
  /** QQ 开放平台的 AppId */
  appId: string;
  /** QQ 开放平台的 AppSecret */
  secret: string;
  /**
   * 已废弃：QQ 开放平台新政策下不再区分沙箱/正式环境，
   * 该字段保留仅为兼容旧配置，不再参与网关地址拼接
   */
  sandBox?: boolean;
  /** 图片上传接口（用于把 Buffer 图片转为可访问的 URL） */
  imageServer: string;
  /** 图片渲染相关配置（可选） */
  browser?: BrowserConfig;
}

/** 图片渲染（浏览器）配置 */
export interface BrowserConfig {
  /** 优先尝试的浏览器通道，如 'chrome' / 'msedge'，默认自动探测 */
  channel?: string | string[];
  /** 指定浏览器可执行文件路径，优先级最高 */
  executablePath?: string;
  /** 浏览器空闲关闭时间（毫秒），默认 30000 */
  idleTimeout?: number;
  /** 启动超时时间（毫秒），默认 30000 */
  timeout?: number;
}

/** 插件声明文件（manifest.json）结构 */
export interface PluginManifest {
  /**
   * 插件 API 版本
   * - 1（缺省）：旧版插件，导出 main/init/cleanup 对象，通过 processingTypes 匹配消息
   * - 2：新版插件，导出 init(ctx) 函数，通过 ctx.register 注册消息处理器
   */
  api?: 1 | 2;
  /** 插件对象名称，必须与主文件导出的插件对象名一致 */
  name: string;
  /** 插件版本号 */
  version: string | number;
  /**
   * 主文件路径（相对插件目录），如 './main'
   * - api: 2 使用 `entry`
   * - api: 1 使用 `mainExport`（也兼容 `entry`）
   */
  mainExport: string;
  /** 主文件路径（api: 2 推荐写法），如 './main' */
  entry?: string;
  /** 作者（可选） */
  author?: string;
  /** 作者（兼容旧拼写，可选） */
  auther?: string;
  /** 处理的消息类型列表，'default' 表示默认处理器 */
  processingTypes: string[];
}

/** 插件返回值：字符串（旧版插件）或对象 */
export interface PluginResultObject {
  /** 文本消息 */
  text?: string;
  /** 图片：Buffer（由框架上传）或图片 URL 字符串 */
  image?: Buffer | string;
}

export type PluginResult = string | PluginResultObject | null | undefined;

/** 图片生成工具集 */
export interface PluginUtils {
  /** Markdown -> HTML 字符串 */
  md2html: (markdownText: string, options?: MarkdownOptions) => string;
  /** HTML -> 图片 Buffer */
  html2img: (htmlContent: string, options?: Html2ImgOptions) => Promise<Buffer>;
  /** Markdown -> 图片 Buffer */
  md2img: (markdownText: string, options?: Md2ImgOptions) => Promise<Buffer>;
}

/** 日志器接口（暴露给插件） */
export interface Logger {
  error(module: string, message: unknown, ...args: unknown[]): void;
  warn(module: string, message: unknown, ...args: unknown[]): void;
  info(module: string, message: unknown, ...args: unknown[]): void;
  debug(module: string, message: unknown, ...args: unknown[]): void;
  plugin(module: string, message: unknown, ...args: unknown[]): void;
}

/** 注入到插件的上下文 */
export interface PluginContext {
  utils: PluginUtils;
  logger: Logger;
}

/** 插件对象（由插件主文件导出） */
export interface PluginInstance {
  /** 插件主处理方法（必需） */
  main: (
    msgType: string,
    msgContent: string,
    senderOpenid: string,
    isPrivate: boolean
  ) => PluginResult | Promise<PluginResult>;
  /** 初始化方法（可选） */
  init?: () => void | Promise<void>;
  /** 清理方法（可选） */
  cleanup?: () => void | Promise<void>;
  /** 由框架注入的上下文 */
  ctx?: PluginContext;
}

/** Markdown 转换配置 */
export interface MarkdownOptions {
  /** 允许 HTML 标签，默认 true */
  html?: boolean;
  /** 自动转换 URL 为链接，默认 true */
  linkify?: boolean;
  /** 启用印刷替换，默认 true */
  typographer?: boolean;
  /** markdown-it 插件列表 */
  plugins?: unknown[];
}

/** HTML 转图片配置 */
export interface Html2ImgOptions {
  /** 视口宽度，默认 450 */
  width?: number;
  /** 视口高度，默认 600 */
  height?: number;
  /** 图片质量（1-100，仅 jpeg），默认 90 */
  quality?: number;
  /** 图片格式，默认 png */
  type?: 'png' | 'jpeg';
  /** 是否截取整页，默认 true */
  fullPage?: boolean;
  /** 是否透明背景，默认 false */
  transparent?: boolean;
  /** 设备像素比，默认 2 */
  deviceScaleFactor?: number;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 渲染后额外等待时间（毫秒），默认 0 */
  waitFor?: number;
}

/** Markdown 转图片配置 */
export interface Md2ImgOptions {
  mdOptions?: MarkdownOptions;
  imgOptions?: Html2ImgOptions;
}

/* ===== 以下为 api: 2 插件使用的类型 ===== */

/** 消息作用域 */
export type MessageScope = 'group' | 'private' | 'all';

/** 收到的消息 */
export interface IncomingMessage {
  /** 消息全文（已去除首尾空白） */
  content: string;
  /** 供插件使用的有效文本：prefix 模式下为去掉前缀后的内容，其余情况等于 content */
  text: string;
  /** 消息 ID（回复时需要） */
  messageId: string;
  /** 群 ID（仅群聊消息） */
  groupId?: string;
  /** 发送者 openid */
  senderId: string;
  /** 是否为私聊消息 */
  isPrivate: boolean;
  /** 使用 match 注册时的正则匹配结果 */
  match?: RegExpMatchArray;
  /** 使用 prefix 注册时命中的前缀 */
  prefix?: string;
}

/** 消息处理函数：返回结果消息，null / undefined 表示不回复 */
export type MessageHandler = (
  msg: IncomingMessage
) => PluginResult | Promise<PluginResult>;

/** 注册消息处理器的配置 */
export interface HandlerRegistration {
  /** 限定生效的群 ID，不填表示所有群 */
  groupId?: string | string[];
  /** 正则匹配（与 prefix 二选一） */
  match?: RegExp;
  /** 前缀匹配（与 match 二选一），不填两者则接收该作用域的全部消息 */
  prefix?: string;
  /** 处理函数 */
  handler: MessageHandler;
}

/** 图片 / Markdown 工具集 */
export interface PluginUtilsV2 {
  /** Markdown 转 HTML 字符串 */
  markdownToHTML: (markdownText: string, options?: MarkdownOptions) => string;
  image: {
    /** Markdown 渲染为图片 Buffer */
    withMarkdown: (markdownText: string, options?: Md2ImgOptions) => Promise<Buffer>;
    /** HTML 渲染为图片 Buffer */
    withHTML: (htmlContent: string, options?: Html2ImgOptions) => Promise<Buffer>;
  };
}

/** api: 2 插件的上下文 */
export interface PluginContextV2 {
  /** API 版本标识 */
  api: 2;
  /** 工具集 */
  util: PluginUtilsV2;
  /** 日志器 */
  logger: Logger;
  /** 插件声明信息 */
  manifest: PluginManifest;
  /** 插件目录绝对路径 */
  dir: string;
  /**
   * 注册消息处理器
   * @param scope 'group' 群聊 / 'private' 私聊 / 'all' 全部
   */
  register: (scope: MessageScope, registration: HandlerRegistration) => void;
  /** 注册群聊消息处理器 */
  onGroup: (registration: HandlerRegistration) => void;
  /** 注册私聊消息处理器 */
  onPrivate: (registration: HandlerRegistration) => void;
  /** 注册卸载回调（插件重载/框架退出时执行） */
  onUnload: (callback: () => void | Promise<void>) => void;
}
