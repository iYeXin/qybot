/**
 * 消息相关类型
 *
 * 发送侧：msg_type 0=文本, 2=Markdown, 7=富媒体（ark/embed 仅频道）
 * 接收侧：message_type 0=文本, 3=结构化卡片, 101=并行, 102=聊天记录, 103=引用
 */

/** 发送消息的 msg_type */
export const MsgType = {
  TEXT: 0,
  MARKDOWN: 2,
  MEDIA: 7,
} as const;

export type MsgTypeValue = (typeof MsgType)[keyof typeof MsgType];

/** Markdown 内容：自定义文本 或 模板 ID + 参数 */
export interface MarkdownPayload {
  /** 自定义 markdown 文本 */
  content?: string;
  /** 平台申请的模板 ID */
  custom_template_id?: string;
  /** 模板变量填充：{ key, values } */
  params?: Array<{ key: string; values: string[] }>;
  /** 图片资源转存失败时中断发送（默认 false） */
  force_verify_image_resource?: boolean;
}

/** 按钮渲染 */
export interface ButtonRenderData {
  label: string;
  visited_label: string;
  /** 0=灰色线框, 1=蓝色线框, 3=白底红字, 4=蓝底白字 */
  style?: number;
}

/** 按钮动作权限 */
export interface ButtonPermission {
  /** 0=指定用户, 1=仅管理者, 2=所有人, 3=指定身份组（仅频道） */
  type: number;
  specify_role_ids?: string[];
  specify_user_ids?: string[];
}

/** 按钮点击二次确认 */
export interface ButtonModal {
  /** 提示文本，最多 40 字符，不能含 URL */
  content: string;
  /** 确认按钮文字，最多 4 字符，默认“确认” */
  confirm_text?: string;
  /** 取消按钮文字，最多 4 字符，默认“取消” */
  cancel_text?: string;
}

/** 按钮动作 */
export interface ButtonAction {
  /** 0=跳转按钮, 1=回调按钮, 2=指令按钮 */
  type: number;
  permission: ButtonPermission;
  /** 操作相关数据（回调时通过 button_data 回传 / 指令按钮插入输入框） */
  data: string;
  /** 指令按钮：是否带引用回复本消息 */
  reply?: boolean;
  /** 指令按钮：点击后自动发送 */
  enter?: boolean;
  /** 指令按钮：设为 1 时唤起手 Q 选图器（会忽略 enter） */
  anchor?: number;
  /** 点击二次确认 */
  modal?: ButtonModal;
  /** 客户端不支持时的提示文案 */
  unsupport_tips?: string;
}

/** 单个按钮 */
export interface Button {
  id?: string;
  render_data: ButtonRenderData;
  action: ButtonAction;
  /** 分组 ID：同一分组内一个按钮操作后，其余按钮变灰（仅 action.type=1 有效） */
  group_id?: string;
}

/** 消息按钮（最多 5 行，每行最多 5 个） */
export interface Keyboard {
  /** 平台申请通过的按钮模板 ID */
  id?: string;
  content?: {
    rows: Array<{ buttons: Button[] }>;
  };
}

/** 富媒体：上传后得到的 file_info */
export interface MediaPayload {
  file_info: string;
}

/** 富媒体文件类型 */
export const FileType = {
  IMAGE: 1,
  VIDEO: 2,
  AUDIO: 3,
  FILE: 4,
} as const;

/** 插件返回的消息内容 */
export interface OutgoingMessage {
  /** 文本内容（msg_type=0） */
  text?: string;
  /**
   * Markdown：字符串或 { content } / { custom_template_id, params }（msg_type=2）
   * 与 text 同时存在时优先发送 Markdown，text 会被忽略（平台要求二者互斥）。
   */
  markdown?: string | MarkdownPayload;
  /** 图片：Buffer（自动分片上传）或公网 URL（msg_type=7） */
  image?: Buffer | string;
  /** 消息按钮，可与 markdown / text 组合 */
  keyboard?: Keyboard;
  /** 已上传好的富媒体 file_info（优先级高于 image，file_info 为空视为无效） */
  media?: MediaPayload;
  /** 引用回复：回复指定消息 ID（内容拆成多条时只挂在最后一条） */
  replyTo?: string;
  /** 被动回复序号：不填由框架自动维护；拆条发送时后续各条自动递增 */
  msgSeq?: number;
  /**
   * 互动召回消息：仅单聊主动消息有效，与 msgId/eventId 互斥。
   * 被动回复携带 msgId/eventId 时会被忽略并告警。
   */
  wakeup?: boolean;
  /** markdown 图片资源转存失败时中断发送（默认 false） */
  forceVerifyImageResource?: boolean;
}

/** 插件可返回的内容 */
export type MessageContent = string | OutgoingMessage | null | undefined | void;

/** 发送选项 */
export interface SendOptions {
  /** 回复的消息 ID（被动消息） */
  msgId?: string;
  /** 响应的事件 ID（事件被动消息） */
  eventId?: string;
  /** 递增序号 */
  seq?: number;
  /** 互动召回消息（仅单聊主动消息，与 msgId/eventId 互斥） */
  wakeup?: boolean;
}

/** 发送结果 */
export interface SentMessage {
  id?: string;
  timestamp?: string;
  [key: string]: unknown;
}
