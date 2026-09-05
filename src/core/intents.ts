/**
 * 事件订阅 intents
 *
 * intents 是一个位掩码，每一位代表一类事件。框架默认会根据插件注册的事件自动计算。
 * 文档：https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html
 */

export const INTENTS = {
  /** 频道变更：GUILD_CREATE / GUILD_UPDATE / GUILD_DELETE / CHANNEL_* */
  GUILDS: 1 << 0,
  /** 频道成员变更：GUILD_MEMBER_ADD / UPDATE / REMOVE */
  GUILD_MEMBERS: 1 << 1,
  /** 频道全量消息（仅私域机器人）：MESSAGE_CREATE / MESSAGE_DELETE */
  GUILD_MESSAGES: 1 << 9,
  /** 表情表态：MESSAGE_REACTION_ADD / REMOVE */
  GUILD_MESSAGE_REACTIONS: 1 << 10,
  /** 频道私信：DIRECT_MESSAGE_CREATE / DELETE */
  DIRECT_MESSAGE: 1 << 12,
  /**
   * 群成员事件（官方 intents 表未列出该位，来自事件文档）：
   * GROUP_MEMBER_ADD / GROUP_MEMBER_REMOVE / GROUP_JOIN_REQUEST
   * 其中入群申请事件还需机器人是群管理员才会收到
   */
  GROUP_MEMBER_EVENT: 1 << 24,
  /**
   * 群聊与单聊事件：
   * GROUP_AT_MESSAGE_CREATE、GROUP_MESSAGE_CREATE（全量群消息，需平台开启「接收所有消息」）、
   * C2C_MESSAGE_CREATE、FRIEND_ADD / DEL、C2C_MSG_RECEIVE / REJECT、
   * GROUP_ADD_ROBOT / GROUP_DEL_ROBOT、GROUP_MSG_RECEIVE / REJECT、SUBSCRIBE_MESSAGE_STATUS
   */
  GROUP_AND_C2C_EVENT: 1 << 25,
  /** 互动事件（按钮回调）：INTERACTION_CREATE */
  INTERACTION: 1 << 26,
  /** 消息审核：MESSAGE_AUDIT_PASS / REJECT */
  MESSAGE_AUDIT: 1 << 27,
  /** 论坛事件（仅私域机器人） */
  FORUMS_EVENT: 1 << 28,
  /** 音频动作 */
  AUDIO_ACTION: 1 << 29,
  /** 公域频道 @ 消息：AT_MESSAGE_CREATE / PUBLIC_MESSAGE_DELETE */
  PUBLIC_GUILD_MESSAGES: 1 << 30,
} as const;

export type IntentName = keyof typeof INTENTS;

/** 事件名 -> 所需 intent */
const EVENT_INTENTS: Record<string, IntentName> = {
  // 群聊 / 单聊
  GROUP_AT_MESSAGE_CREATE: 'GROUP_AND_C2C_EVENT',
  GROUP_MESSAGE_CREATE: 'GROUP_AND_C2C_EVENT',
  C2C_MESSAGE_CREATE: 'GROUP_AND_C2C_EVENT',
  FRIEND_ADD: 'GROUP_AND_C2C_EVENT',
  FRIEND_DEL: 'GROUP_AND_C2C_EVENT',
  C2C_MSG_RECEIVE: 'GROUP_AND_C2C_EVENT',
  C2C_MSG_REJECT: 'GROUP_AND_C2C_EVENT',
  GROUP_ADD_ROBOT: 'GROUP_AND_C2C_EVENT',
  GROUP_DEL_ROBOT: 'GROUP_AND_C2C_EVENT',
  GROUP_MSG_RECEIVE: 'GROUP_AND_C2C_EVENT',
  GROUP_MSG_REJECT: 'GROUP_AND_C2C_EVENT',
  SUBSCRIBE_MESSAGE_STATUS: 'GROUP_AND_C2C_EVENT',
  GROUP_MEMBER_ADD: 'GROUP_MEMBER_EVENT',
  GROUP_MEMBER_REMOVE: 'GROUP_MEMBER_EVENT',
  GROUP_JOIN_REQUEST: 'GROUP_MEMBER_EVENT',

  // 互动 / 审核
  INTERACTION_CREATE: 'INTERACTION',
  MESSAGE_AUDIT_PASS: 'MESSAGE_AUDIT',
  MESSAGE_AUDIT_REJECT: 'MESSAGE_AUDIT',

  // 频道
  GUILD_CREATE: 'GUILDS',
  GUILD_UPDATE: 'GUILDS',
  GUILD_DELETE: 'GUILDS',
  CHANNEL_CREATE: 'GUILDS',
  CHANNEL_UPDATE: 'GUILDS',
  CHANNEL_DELETE: 'GUILDS',
  GUILD_MEMBER_ADD: 'GUILD_MEMBERS',
  GUILD_MEMBER_UPDATE: 'GUILD_MEMBERS',
  GUILD_MEMBER_REMOVE: 'GUILD_MEMBERS',
  MESSAGE_CREATE: 'GUILD_MESSAGES',
  MESSAGE_DELETE: 'GUILD_MESSAGES',
  MESSAGE_REACTION_ADD: 'GUILD_MESSAGE_REACTIONS',
  MESSAGE_REACTION_REMOVE: 'GUILD_MESSAGE_REACTIONS',
  DIRECT_MESSAGE_CREATE: 'DIRECT_MESSAGE',
  DIRECT_MESSAGE_DELETE: 'DIRECT_MESSAGE',
  AT_MESSAGE_CREATE: 'PUBLIC_GUILD_MESSAGES',
  PUBLIC_MESSAGE_DELETE: 'PUBLIC_GUILD_MESSAGES',
  FORUM_THREAD_CREATE: 'FORUMS_EVENT',
  FORUM_THREAD_UPDATE: 'FORUMS_EVENT',
  FORUM_THREAD_DELETE: 'FORUMS_EVENT',
  FORUM_POST_CREATE: 'FORUMS_EVENT',
  FORUM_POST_DELETE: 'FORUMS_EVENT',
  FORUM_REPLY_CREATE: 'FORUMS_EVENT',
  FORUM_REPLY_DELETE: 'FORUMS_EVENT',
  FORUM_PUBLISH_AUDIT_RESULT: 'FORUMS_EVENT',
  AUDIO_START: 'AUDIO_ACTION',
  AUDIO_FINISH: 'AUDIO_ACTION',
  AUDIO_ON_MIC: 'AUDIO_ACTION',
  AUDIO_OFF_MIC: 'AUDIO_ACTION',
};

/** 查询事件名所需的 intent 名称 */
export function intentOfEvent(event: string): IntentName | undefined {
  return EVENT_INTENTS[event];
}

/** 计算一组事件所需的 intents 位掩码 */
export function intentsForEvents(events: Iterable<string>): number {
  let mask = 0;
  for (const event of events) {
    const name = EVENT_INTENTS[event];
    if (name) mask |= INTENTS[name];
  }
  return mask;
}

/** 解析 intents 配置（数字位掩码 / intent 名数组） */
export function resolveIntents(config: number | string[] | undefined): number | undefined {
  if (config === undefined) return undefined;
  if (typeof config === 'number') return config;

  let mask = 0;
  for (const name of config) {
    const value = INTENTS[name as IntentName];
    if (value === undefined) {
      throw new Error(`未知的 intent 名称: ${name}`);
    }
    mask |= value;
  }
  return mask;
}
