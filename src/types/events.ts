/**
 * 网关事件数据结构
 * 字段含义以 QQ 开放平台 V2 文档为准（autogen/event/*）
 */

/** 用户（消息发送者 / 群成员） */
export interface GatewayUser {
  /** 用户唯一标识（OpenID） */
  id?: string;
  /** 昵称 */
  username?: string;
  /** 是否机器人 */
  bot?: boolean;
  /** 跨应用统一标识（需申请才返回） */
  union_openid?: string;
  /** 跨应用统一账号（需申请才返回） */
  union_user_account?: string;
  /** 单聊场景的用户 OpenID */
  user_openid?: string;
  /** 群聊场景的群成员 OpenID */
  member_openid?: string;
  /** 群内角色：member=普通成员, admin=管理员, owner=群主 */
  member_role?: 'member' | 'admin' | 'owner' | string;
}

/** 消息场景上下文 */
export interface MessageScene {
  /** 场景来源，default=默认聊天窗口 */
  source?: string;
  /** key=value 扩展数据：msg_idx / ref_msg_idx / auth_token */
  ext?: string[];
}

/** 消息附件（图片、视频、语音、文件） */
export interface MessageAttachment {
  url?: string;
  filename?: string;
  /** 图片宽度（非图片附件无此字段） */
  width?: number;
  /** 图片高度（非图片附件无此字段） */
  height?: number;
  /** 文件大小（字节） */
  size?: number;
  /** voice / image/jpeg / image/png / image/gif / video/mp4 / file */
  content_type?: string;
  /** 语音转换后的 WAV 地址 */
  voice_wav_url?: string;
  /** 语音 ASR 参考结果 */
  asr_refer_text?: string;
}

/** 结构化卡片数据（message_type=3） */
export interface ArkData {
  prompt?: string;
  /** tuwen / feed / miniapp / map / contact_card / video_share / music_together */
  ark_type?: string;
  ark_name?: string;
  fields?: Record<string, unknown>;
}

/** 消息元素（引用消息、聊天记录等，递归结构） */
export interface MsgElement {
  msg_idx?: string;
  author?: GatewayUser;
  /** 0=文本, 3=结构化卡片, 101=并行消息, 102=聊天记录, 103=引用消息 */
  message_type?: number;
  content?: string;
  attachments?: MessageAttachment[];
  ark_data?: ArkData;
  msg_elements?: MsgElement[];
}

/** 消息内容类型 */
export const MessageType = {
  TEXT: 0,
  ARK: 3,
  PARALLEL: 101,
  CHAT_HISTORY: 102,
  REFERENCE: 103,
} as const;

/** 群消息 / 单聊消息事件的公共字段 */
export interface MessageEventData {
  /** 消息 ID，可用于被动回复与撤回 */
  id?: string;
  author?: GatewayUser;
  /** 消息文本内容（群聊 @ 消息已去除 @ 前缀） */
  content?: string;
  /** 群 OpenID（群聊场景） */
  group_openid?: string;
  /** 消息发送时间，RFC3339 */
  timestamp?: string;
  message_type?: number;
  message_scene?: MessageScene;
  attachments?: MessageAttachment[];
  /** 消息中 @ 的用户列表（不含机器人自身） */
  mentions?: GatewayUser[];
  ark_data?: ArkData;
  msg_elements?: MsgElement[];
}

/** GROUP_AT_MESSAGE_CREATE：群里 @ 机器人 */
export type GroupAtMessageEvent = MessageEventData;

/** GROUP_MESSAGE_CREATE：群全量消息（需在平台开启「接收所有消息」） */
export type GroupMessageEvent = MessageEventData;

/** C2C_MESSAGE_CREATE：用户单聊发消息给机器人 */
export type C2CMessageEvent = MessageEventData;

/** 机器人进出群 / 群消息开关事件 */
export interface GroupRobotEventData {
  timestamp?: number;
  group_openid?: string;
  /** 操作者群成员 OpenID */
  op_member_openid?: string;
}

/** 群成员增减（intent 1<<24） */
export interface GroupMemberEventData {
  timestamp?: number;
  group_openid?: string;
  member_openid?: string;
  user_openid?: string;
}

/** 入群申请验证信息 */
export interface JoinVerifyInfo {
  /** verify_message / admin_review_qa */
  method?: string;
  verify_message?: string;
  review_qa_list?: Array<{ question?: string; answer?: string }>;
}

/** GROUP_JOIN_REQUEST：用户申请入群（机器人须为群管理员） */
export interface GroupJoinRequestEventData {
  group_openid?: string;
  /** 申请 ID，审批时需回传 */
  join_request_id?: string;
  risk_tips?: string;
  union_openid?: string;
  member_openid?: string;
  username?: string;
  apply_at?: string;
  /** self_apply=主动申请, invited=被邀请 */
  apply_source?: 'self_apply' | 'invited' | string;
  invited_by?: string;
  bot?: boolean;
  verify_info?: JoinVerifyInfo;
  /** 自动审批通过信息（仅下行事件携带） */
  auto_approved?: { strategy_id?: string };
}

/** FRIEND_ADD */
export interface FriendAddEventData {
  timestamp?: number;
  openid?: string;
  /** 1000=默认, 1001/1002=网络搜索, 1003=群场景, 1004=空间场景, 2001~2004=分享资料页 */
  scene?: number;
  /** 开发者自定义回调数据，用于区分来源 */
  scene_param?: string;
  author?: { union_openid?: string };
  short_code?: string;
}

/** FRIEND_DEL */
export interface FriendDelEventData {
  timestamp?: number;
  openid?: string;
  author?: { union_openid?: string };
}

/** C2C_MSG_RECEIVE / C2C_MSG_REJECT：用户开关主动消息推送 */
export interface C2CMsgSwitchEventData {
  timestamp?: number;
  openid?: string;
}

/** 互动解析数据 */
export interface InteractionResolved {
  button_data?: string;
  button_id?: string;
  user_id?: string;
  feature_id?: string;
  message_id?: string;
  /** LIKE / UNLIKE（type=13） */
  feedback_opt?: string;
  checked?: number;
  action?: string;
  message_scene?: { ext?: string[] };
  authorize_data?: { opt_scene?: string; scope?: string };
}

/** INTERACTION_CREATE：按钮回调等互动事件 */
export interface InteractionEventData {
  /** 互动 ID，需用于 PUT /interactions/{id} 回应 */
  id?: string;
  /** 11=按钮回调, 12=快捷菜单, 13=消息反馈, 14=清空会话, 15=故事集, 16=切换模型, 18/19/20=授权 */
  type?: number;
  /** c2c / group / guild */
  scene?: string;
  /** 0=频道, 1=群聊, 2=单聊 */
  chat_type?: number;
  timestamp?: string;
  guild_id?: string;
  channel_id?: string;
  user_openid?: string;
  group_openid?: string;
  group_member_openid?: string;
  data?: { type?: number; resolved?: InteractionResolved };
  version?: number;
  application_id?: string;
}

/** 互动事件类型枚举 */
export const InteractionType = {
  /** 消息按钮回调（需回应） */
  INLINE_KEYBOARD: 11,
  /** 单聊快捷菜单回调（需回应） */
  CALLBACK_COMMAND: 12,
  MESSAGE_FEEDBACK: 13,
  CLEAR_SESSION: 14,
  IN_OUT_STORY: 15,
  SWITCH_MODEL: 16,
  USER_AUTHORIZE: 18,
  GROUP_AUTHORIZE: 19,
  GROUP_AUTHORIZE_STATUS: 20,
} as const;

/** 频道事件 */
export interface GuildEventData {
  id?: string;
  name?: string;
  icon?: string;
  owner_id?: string;
  member_count?: number;
  max_members?: number;
  description?: string;
  joined_at?: string;
  op_user_id?: string;
}

/** 子频道事件 */
export interface ChannelEventData {
  id?: string;
  guild_id?: string;
  name?: string;
  /** 0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛 */
  type?: number;
  sub_type?: number;
  owner_id?: string;
  op_user_id?: string;
  position?: number;
}

/** 订阅消息授权状态 */
export interface SubscribeMessageStatusEventData {
  group_openid?: string;
  openid?: string;
  result?: Array<{
    template_id?: number;
    custom_template_id?: string;
    /** 1=允许, 2=拒绝 */
    op?: number;
    subscribe_id?: string;
    subscribe_ts?: number;
    update_ts?: number;
  }>;
}

/** 事件名枚举 */
export const EVENTS = {
  GROUP_AT_MESSAGE_CREATE: 'GROUP_AT_MESSAGE_CREATE',
  GROUP_MESSAGE_CREATE: 'GROUP_MESSAGE_CREATE',
  C2C_MESSAGE_CREATE: 'C2C_MESSAGE_CREATE',
  GROUP_ADD_ROBOT: 'GROUP_ADD_ROBOT',
  GROUP_DEL_ROBOT: 'GROUP_DEL_ROBOT',
  GROUP_MSG_RECEIVE: 'GROUP_MSG_RECEIVE',
  GROUP_MSG_REJECT: 'GROUP_MSG_REJECT',
  GROUP_MEMBER_ADD: 'GROUP_MEMBER_ADD',
  GROUP_MEMBER_REMOVE: 'GROUP_MEMBER_REMOVE',
  GROUP_JOIN_REQUEST: 'GROUP_JOIN_REQUEST',
  FRIEND_ADD: 'FRIEND_ADD',
  FRIEND_DEL: 'FRIEND_DEL',
  C2C_MSG_RECEIVE: 'C2C_MSG_RECEIVE',
  C2C_MSG_REJECT: 'C2C_MSG_REJECT',
  INTERACTION_CREATE: 'INTERACTION_CREATE',
  SUBSCRIBE_MESSAGE_STATUS: 'SUBSCRIBE_MESSAGE_STATUS',
  GUILD_CREATE: 'GUILD_CREATE',
  GUILD_UPDATE: 'GUILD_UPDATE',
  GUILD_DELETE: 'GUILD_DELETE',
  CHANNEL_CREATE: 'CHANNEL_CREATE',
  CHANNEL_UPDATE: 'CHANNEL_UPDATE',
  CHANNEL_DELETE: 'CHANNEL_DELETE',
} as const;
