import type { QQApi } from '../api/index.ts';
import type {
  ArkData,
  GatewayUser,
  InteractionEventData,
  MessageAttachment,
  MessageScene,
  MessageEventData,
  MsgElement,
} from './events.ts';
import type { Logger } from './logger.ts';
import type { MessageContent, SentMessage } from './message.ts';
import type { PluginUtils } from './utils.ts';

/** 插件声明文件（manifest.json） */
export interface PluginManifest {
  /** 插件 API 版本，必须为 3 */
  api: 3;
  /** 插件名称 */
  name: string;
  /** 版本号 */
  version?: string | number;
  /** 入口文件（相对插件目录），缺省 './main' */
  entry?: string;
  /** 作者 */
  author?: string;
}

/** 收到的消息上下文 */
export interface MessageContext {
  /** 触发的事件名：GROUP_AT_MESSAGE_CREATE / GROUP_MESSAGE_CREATE / C2C_MESSAGE_CREATE */
  event: string;
  /** 消息全文（群聊 @ 消息已去除 @ 前缀） */
  content: string;
  /** 有效文本：prefix 模式下为去掉前缀后的内容，其余情况等于 content */
  text: string;
  /** 正则匹配结果（使用 match 注册时） */
  match?: RegExpMatchArray;
  /** 命中的前缀（使用 prefix 注册时） */
  prefix?: string;

  /** 消息 ID，用于被动回复与撤回 */
  messageId?: string;
  /** 事件最外层 ID，用于事件被动回复 */
  eventId?: string;

  /** 群 OpenID（群聊） */
  groupOpenid?: string;
  /** 发送者标识：群聊为 member_openid，单聊为 user_openid */
  senderId: string;
  /** 单聊用户 OpenID */
  userOpenid?: string;
  /** 群成员 OpenID */
  memberOpenid?: string;
  /** 发送者昵称 */
  nickname?: string;
  /** 群内角色：member / admin / owner */
  memberRole?: string;

  isGroup: boolean;
  isPrivate: boolean;

  timestamp?: string;
  /** 消息内容类型：0=文本, 3=结构化卡片, 101=并行, 102=聊天记录, 103=引用 */
  messageType?: number;
  messageScene?: MessageScene;
  attachments?: MessageAttachment[];
  mentions?: GatewayUser[];
  arkData?: ArkData;
  msgElements?: MsgElement[];
  /** 原始事件数据 */
  raw: MessageEventData;

  /**
   * 回复本条消息（被动消息，框架自动维护 msg_seq）。
   * 同一条消息的被动回复次数超限后，会自动降级为主动消息发出。
   */
  reply: (content: MessageContent) => Promise<SentMessage[]>;
  /** 发送主动消息到当前会话（群聊发群、单聊发用户） */
  send: (content: MessageContent) => Promise<SentMessage[]>;
  /** OpenAPI 客户端 */
  api: QQApi;
  logger: Logger;
}

/** 通用事件上下文 */
export interface EventContext {
  /** 事件名，如 GROUP_ADD_ROBOT / FRIEND_ADD */
  event: string;
  /** 事件最外层 ID，可用于被动回复 */
  eventId?: string;
  /** 事件数据 */
  data: unknown;
  timestamp?: string | number;
  /** 响应事件（仅部分事件支持，如 GROUP_ADD_ROBOT / FRIEND_ADD / C2C_MSG_RECEIVE） */
  reply?: (content: MessageContent) => Promise<SentMessage[]>;
  api: QQApi;
  logger: Logger;
}

/** 互动事件上下文（按钮回调等） */
export interface InteractionContext {
  /** interaction_id，用于 ctx.api.message.respondInteraction */
  id: string;
  /** 11=按钮回调, 12=快捷菜单, 13=消息反馈, ... */
  type?: number;
  /** c2c / group / guild */
  scene?: string;
  /** 0=频道, 1=群聊, 2=单聊 */
  chatType?: number;
  /** 按钮 action.data */
  buttonData?: string;
  buttonId?: string;
  /** 操作的消息 ID */
  messageId?: string;
  groupOpenid?: string;
  userOpenid?: string;
  memberOpenid?: string;
  guildId?: string;
  channelId?: string;
  timestamp?: string;
  /** 事件最外层 ID，用于被动回复 */
  eventId?: string;
  /** 原始事件数据 */
  raw: InteractionEventData;

  /** 回应互动（type=11/12 必须回应，否则客户端一直 loading） */
  respond: (code?: number) => Promise<void>;
  /** 用事件 ID 被动回复消息 */
  reply: (content: MessageContent) => Promise<SentMessage[]>;
  api: QQApi;
  logger: Logger;
}

/** 消息处理器 */
export type MessageHandler = (msg: MessageContext) => MessageContent | Promise<MessageContent>;

/** 事件处理器 */
export type EventHandler = (
  event: EventContext
) => MessageContent | void | Promise<MessageContent | void>;

/** 互动处理器 */
export type InteractionHandler = (
  interaction: InteractionContext
) => MessageContent | void | Promise<MessageContent | void>;

/** 消息作用域 */
export type MessageScope = 'at' | 'group' | 'c2c' | 'all';

/** 消息匹配条件（匹配均为大小写敏感，ignoreCase 只影响 prefix） */
export interface MessageFilter {
  /** 限定生效的群 OpenID（可多个，仅群消息有效） */
  groups?: string | string[];
  /** 正则匹配整条消息（每次匹配前复位，可安全使用 g 标志） */
  match?: RegExp;
  /** 前缀匹配（可多个，命中后 msg.text 为去掉前缀的内容） */
  prefix?: string | string[];
  /** 前缀是否忽略大小写，默认 false（不影响 match，请用正则的 i 标志） */
  ignoreCase?: boolean;
}

/** 消息处理器注册选项（prefix 与 match 互斥，不填则接收全部消息） */
export interface MessageHandlerOptions extends MessageFilter {
  /**
   * 处理函数：返回内容即自动回复，返回 null/undefined/空串则不回复。
   * 若在函数内已手动 reply/send，请返回 null，避免自动回复造成重复发送。
   */
  handler: MessageHandler;
}

/** 互动处理器注册选项 */
export interface InteractionHandlerOptions {
  /** 只处理指定 type（如 11=按钮回调），不填则接收全部互动事件 */
  type?: number | number[];
  /** 处理函数 */
  handler: InteractionHandler;
}

/** 卸载回调 */
export type UnloadCallback = () => void | Promise<void>;

/** 插件上下文（init 的参数） */
export interface PluginContext {
  /** 日志器 */
  logger: Logger;
  /** 插件声明内容 */
  manifest: PluginManifest;
  /** 插件目录绝对路径 */
  dir: string;
  /**
   * OpenAPI 门面：
   * ctx.api.message / media / group / bot / guild / panel / menu
   */
  api: QQApi;
  /** 图片与 Markdown 工具集 */
  util: PluginUtils;

  /**
   * 注册消息处理器
   * @param scope 'at'=群内@机器人 / 'group'=群全量消息（需平台开启「接收所有消息」）/ 'c2c'=单聊 / 'all'=全部
   */
  onMessage: (scope: MessageScope, options: MessageHandlerOptions) => void;
  /** 注册任意网关事件处理器 */
  on: (event: string | string[], handler: EventHandler) => void;
  /** 注册互动事件处理器（按钮回调等） */
  onInteraction: (options: InteractionHandlerOptions) => void;
  /** 注册卸载回调 */
  onUnload: (callback: UnloadCallback) => void;
}

/** 插件入口导出的 init 函数 */
export type PluginInit = (ctx: PluginContext) => void | Promise<void>;
