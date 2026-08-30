import { botConfig } from '../config.ts';
import { request } from './http.ts';

/** 令牌接口返回结构 */
interface AccessTokenData {
  access_token: string;
  expires_in: number;
}

/** WebSocket 网关返回结构 */
export interface WsLinkData {
  url: string;
}

/** 上传文件接口返回结构 */
export type FileInfo = Record<string, unknown>;

/** 消息发送返回结构 */
export type SendResult = Record<string, unknown>;

/** 获取 accessToken */
export function getAccessToken(): Promise<AccessTokenData> {
  return request<AccessTokenData>({
    url: 'https://bots.qq.com/app/getAppAccessToken',
    method: 'POST',
    data: {
      appId: botConfig.appId,
      clientSecret: botConfig.secret,
    },
  });
}

/**
 * 获取 WebSocket 网关地址
 *
 * 注意：QQ 开放平台新政策下，新版本开发平台创建的机器人不再区分沙箱/正式环境，
 * 统一使用 api.sgroup.qq.com/gateway
 */
export function getWsLink(accessToken: string): Promise<WsLinkData> {
  return request<WsLinkData>({
    url: 'https://api.sgroup.qq.com/gateway',
    method: 'GET',
    headers: { Authorization: `QQBot ${accessToken}` },
    params: { language: 'zh' },
  });
}

/** 上传群聊图片 */
export function uploadImage(
  accessToken: string,
  imgUrl: string,
  groupId: string
): Promise<FileInfo> {
  if (!groupId) throw new Error('缺少必要的 groupId 参数');

  return request<FileInfo>({
    url: `https://api.sgroup.qq.com/v2/groups/${groupId}/files`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data: { file_type: 1, url: imgUrl, srv_send_msg: false },
  });
}

/** 上传私聊图片 */
export function uploadImageForPrivate(
  accessToken: string,
  imgUrl: string,
  openid: string
): Promise<FileInfo> {
  if (!openid) throw new Error('缺少必要的 openid 参数');

  return request<FileInfo>({
    url: `https://api.sgroup.qq.com/v2/users/${openid}/files`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data: { file_type: 1, url: imgUrl, srv_send_msg: false },
  });
}

/** 发送群聊文本消息 */
export function botSendMessage(
  accessToken: string,
  content: string,
  messageId: string,
  groupId: string
): Promise<SendResult> {
  if (!groupId) throw new Error('缺少必要的 groupId 参数');

  return request<SendResult>({
    url: `https://api.sgroup.qq.com/v2/groups/${groupId}/messages`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data: { content, msg_type: 0, msg_id: messageId },
  });
}

/** 发送群聊图文消息 */
export function botSendImageMessage(
  accessToken: string,
  content: string,
  imgFileinfo: FileInfo | null,
  messageId: string,
  groupId: string
): Promise<SendResult> {
  if (!groupId) throw new Error('缺少必要的 groupId 参数');

  const data = imgFileinfo
    ? { content, msg_type: 7, msg_id: messageId, media: imgFileinfo }
    : { content, msg_type: 0, msg_id: messageId };

  return request<SendResult>({
    url: `https://api.sgroup.qq.com/v2/groups/${groupId}/messages`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data,
  });
}

/** 发送私聊文本消息 */
export function sendPrivateMessage(
  accessToken: string,
  content: string,
  messageId: string,
  openid: string
): Promise<SendResult> {
  if (!openid) throw new Error('缺少必要的 openid 参数');

  return request<SendResult>({
    url: `https://api.sgroup.qq.com/v2/users/${openid}/messages`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data: { content, msg_type: 0, msg_id: messageId },
  });
}

/** 发送私聊图文消息 */
export function sendPrivateImageMessage(
  accessToken: string,
  content: string,
  imgFileinfo: FileInfo | null,
  messageId: string,
  openid: string
): Promise<SendResult> {
  if (!openid) throw new Error('缺少必要的 openid 参数');

  const data = imgFileinfo
    ? { content, msg_type: 7, msg_id: messageId, media: imgFileinfo }
    : { content, msg_type: 0, msg_id: messageId };

  return request<SendResult>({
    url: `https://api.sgroup.qq.com/v2/users/${openid}/messages`,
    method: 'POST',
    headers: { Authorization: `QQBot ${accessToken}` },
    data,
  });
}
