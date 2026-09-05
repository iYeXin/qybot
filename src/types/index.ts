/**
 * QYbot 公共类型（插件可直接 `import type` 引用）
 */

export type { BrowserConfig, GatewayConfig, BotConfig } from './config.ts';

export type { LogLevel, Logger } from './logger.ts';

export type { MarkdownOptions, Html2ImgOptions, Md2ImgOptions } from './image.ts';
export type { PluginUtils } from './utils.ts';

export type {
  GatewayUser,
  MessageScene,
  MessageAttachment,
  ArkData,
  MsgElement,
  MessageEventData,
  GroupAtMessageEvent,
  GroupMessageEvent,
  C2CMessageEvent,
  GroupRobotEventData,
  GroupMemberEventData,
  GroupJoinRequestEventData,
  JoinVerifyInfo,
  FriendAddEventData,
  FriendDelEventData,
  C2CMsgSwitchEventData,
  InteractionResolved,
  InteractionEventData,
  GuildEventData,
  ChannelEventData,
  SubscribeMessageStatusEventData,
} from './events.ts';

export {
  MessageType,
  InteractionType,
  EVENTS,
} from './events.ts';

export type {
  MsgTypeValue,
  MarkdownPayload,
  ButtonRenderData,
  ButtonPermission,
  ButtonAction,
  ButtonModal,
  Button,
  Keyboard,
  MediaPayload,
  OutgoingMessage,
  MessageContent,
  SentMessage,
} from './message.ts';

export { MsgType, FileType } from './message.ts';

export type {
  PluginManifest,
  PluginContext,
  PluginInit,
  MessageContext,
  EventContext,
  InteractionContext,
  MessageHandler,
  EventHandler,
  InteractionHandler,
  MessageScope,
  MessageFilter,
  MessageHandlerOptions,
  InteractionHandlerOptions,
  UnloadCallback,
} from './plugin.ts';
