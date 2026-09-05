import type { ApiClient } from './client.ts';
import { logger } from '../core/logger.ts';
import type { MediaApi, MediaScene } from './media.ts';
import { MsgType, type Keyboard, type MarkdownPayload, type MessageContent, type OutgoingMessage, type SentMessage } from '../types/message.ts';

/** 发送目标（目前仅支持群聊与单聊） */
export interface MessageTarget {
  /** group=群聊, user=单聊(C2C) */
  scene: 'group' | 'user';
  /** group_openid / user_openid */
  id: string;
}

/** 发送选项 */
export interface SendOptions {
  /** 回复的消息 ID（被动消息） */
  msgId?: string;
  /** 响应的事件 ID（事件被动消息） */
  eventId?: string;
  /** 递增序号（拆条发送时后续各条自动递增） */
  seq?: number;
  /** 互动召回消息（仅单聊主动消息，与 msgId/eventId 互斥） */
  wakeup?: boolean;
}

/** 流式消息分片参数 */
export interface StreamChunk {
  /** 首次不传，后续传上一次返回的 id */
  streamMsgId?: string;
  index: number;
  content: string;
  contentType?: 'text' | 'markdown';
  /** 1=生成中, 10=生成结束 */
  inputState?: number;
  /** append=追加, replace=全量替换 */
  inputMode?: 'append' | 'replace';
  msgId?: string;
  eventId?: string;
  seq?: number;
  wakeup?: boolean;
}

/** 流式消息响应 */
export interface StreamResult {
  id?: string;
  timestamp?: string;
  ext_info?: { ref_idx?: string };
  remain_msg_len?: number;
}

/** 互动回应 code */
export const InteractionCode = {
  SUCCESS: 0,
  FAILED: 1,
  TOO_FREQUENT: 2,
  DUPLICATE: 3,
  NO_PERMISSION: 4,
  ADMIN_ONLY: 5,
} as const;

/**
 * 消息收发
 *
 * 主动消息：不传 msg_id / event_id
 * 被动消息：传 msg_id（回复用户消息）或 event_id（响应事件）
 * 互动召回：单聊传 wakeup=true（与 msg_id/event_id 互斥）
 */
export class MessageApi {
  private readonly client: ApiClient;
  private readonly media: MediaApi;

  constructor(client: ApiClient, media: MediaApi) {
    this.client = client;
    this.media = media;
  }

  /** 发送消息（内容含图片时可能拆成多条） */
  async send(target: MessageTarget, content: MessageContent, options: SendOptions = {}): Promise<SentMessage[]> {
    if (content === null || content === undefined) return [];

    const payloads = await this.buildPayloads(target, content, options);
    if (payloads.length === 0) return [];

    const path = this.pathOf(target);
    const results: SentMessage[] = [];

    for (const payload of payloads) {
      const result = await this.client.post<SentMessage>(path, payload);
      results.push(result ?? {});
    }
    return results;
  }

  /** 撤回群聊消息（2 分钟内） */
  async recallGroup(groupOpenid: string, messageId: string): Promise<void> {
    await this.client.delete(`/v2/groups/${groupOpenid}/messages/${messageId}`);
  }

  /** 撤回单聊消息（2 分钟内） */
  async recallUser(userOpenid: string, messageId: string): Promise<void> {
    await this.client.delete(`/v2/users/${userOpenid}/messages/${messageId}`);
  }

  /** 发送单聊「输入中」状态 */
  async sendTyping(
    userOpenid: string,
    seconds = 30,
    options: { msgId?: string; eventId?: string; seq?: number } = {}
  ): Promise<SentMessage> {
    return await this.client.post<SentMessage>(`/v2/users/${userOpenid}/messages`, {
      msg_type: 6,
      input_notify: { input_type: 1, input_second: Math.min(60, Math.max(1, seconds)) },
      ...(options.msgId ? { msg_id: options.msgId, msg_seq: options.seq ?? 1 } : {}),
      ...(options.eventId ? { event_id: options.eventId, msg_seq: options.seq ?? 1 } : {}),
    });
  }

  /** 流式发送单聊消息（首片不传 streamMsgId） */
  async sendStream(userOpenid: string, chunk: StreamChunk): Promise<StreamResult> {
    return await this.client.post<StreamResult>(`/v2/users/${userOpenid}/stream_messages`, {
      input_mode: chunk.inputMode ?? 'append',
      input_state: chunk.inputState ?? 1,
      index: chunk.index,
      content_type: chunk.contentType ?? 'text',
      content_raw: chunk.content,
      ...(chunk.streamMsgId ? { stream_msg_id: chunk.streamMsgId } : {}),
      ...(chunk.msgId ? { msg_id: chunk.msgId } : {}),
      ...(chunk.eventId ? { event_id: chunk.eventId } : {}),
      ...(chunk.seq ? { msg_seq: chunk.seq } : {}),
      ...(chunk.wakeup ? { is_wakeup: true } : {}),
    });
  }

  /** 回应互动事件（type=11 按钮 / type=12 快捷菜单必须回应） */
  async respondInteraction(interactionId: string, code: number = InteractionCode.SUCCESS): Promise<void> {
    await this.client.put(`/interactions/${interactionId}`, { code });
  }

  /** 将插件返回的内容转换为一个或多个 API 请求体 */
  private async buildPayloads(
    target: MessageTarget,
    content: MessageContent,
    options: SendOptions
  ): Promise<Array<Record<string, unknown>>> {
    const message = this.normalize(content);

    if (message.keyboard) assertKeyboardSize(message.keyboard);

    const baseSeq = options.seq ?? message.msgSeq ?? 1;
    const payloads: Array<Record<string, unknown>> = [];

    // 富媒体：已上传的 file_info 优先，其次 image（Buffer 或 URL）
    let media = message.media?.file_info ? message.media : undefined;
    if (message.media && !media) {
      throw new Error('media.file_info 为空，无法发送富媒体消息');
    }
    if (!media && message.image) {
      const uploaded =
        typeof message.image === 'string'
          ? await this.media.uploadByUrl(target.scene as MediaScene, target.id, { url: message.image })
          : await this.media.uploadImage(target.scene as MediaScene, target.id, message.image);
      if (!uploaded.file_info) {
        throw new Error('图片上传未返回 file_info，无法发送富媒体消息');
      }
      media = { file_info: uploaded.file_info };
    }

    // 文本 / Markdown（平台要求二者互斥，Markdown 优先；与图片共存时先发文本再发图片）
    const hasText = Boolean(message.text);
    const hasMarkdown = Boolean(message.markdown);
    if (hasText && hasMarkdown) {
      logger.warn('MSG', 'text 与 markdown 同时存在时只发送 Markdown，text 会被忽略');
    }

    const common = (index: number): Record<string, unknown> =>
      this.buildCommonFields(target, options, message, baseSeq + index);

    if (hasMarkdown) {
      payloads.push({
        msg_type: MsgType.MARKDOWN,
        markdown: this.buildMarkdown(message.markdown, message.forceVerifyImageResource),
        ...(message.keyboard ? { keyboard: message.keyboard } : {}),
        ...common(payloads.length),
      });
    } else if (hasText) {
      payloads.push({
        msg_type: MsgType.TEXT,
        content: message.text,
        ...(message.keyboard ? { keyboard: message.keyboard } : {}),
        ...common(payloads.length),
      });
    }

    if (media) {
      payloads.push({ msg_type: MsgType.MEDIA, media, ...common(payloads.length) });
    }

    if (payloads.length === 0) return [];

    // 引用回复只挂在最后一条
    if (message.replyTo) {
      payloads[payloads.length - 1] = {
        ...payloads[payloads.length - 1],
        message_reference: { message_id: message.replyTo },
      };
    }

    return payloads;
  }

  /** 归一化插件返回内容 */
  private normalize(content: MessageContent): OutgoingMessage {
    if (typeof content === 'string') return { text: content };
    return (content ?? {}) as OutgoingMessage;
  }

  /** 构造 msg_id / event_id / msg_seq / is_wakeup 等公共字段 */
  private buildCommonFields(
    target: MessageTarget,
    options: SendOptions,
    message: OutgoingMessage,
    seq: number
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    const wakeup = options.wakeup ?? message.wakeup ?? false;

    if (options.msgId) {
      fields.msg_id = options.msgId;
      fields.msg_seq = seq;
      if (wakeup) logger.warn('MSG', '被动回复携带 msg_id 时 wakeup 会被忽略');
    } else if (options.eventId) {
      fields.event_id = options.eventId;
      fields.msg_seq = seq;
      if (wakeup) logger.warn('MSG', '被动回复携带 event_id 时 wakeup 会被忽略');
    } else if (wakeup) {
      if (target.scene !== 'user') {
        throw new Error('wakeup（互动召回）仅支持单聊主动消息');
      }
      fields.is_wakeup = true;
    }

    return fields;
  }

  private buildMarkdown(
    markdown: string | MarkdownPayload | undefined,
    forceVerify?: boolean
  ): MarkdownPayload {
    const payload: MarkdownPayload = typeof markdown === 'string' ? { content: markdown } : { ...markdown };
    if (forceVerify) {
      return { ...payload, force_verify_image_resource: true };
    }
    return payload;
  }

  private pathOf(target: MessageTarget): string {
    switch (target.scene) {
      case 'group':
        return `/v2/groups/${target.id}/messages`;
      case 'user':
        return `/v2/users/${target.id}/messages`;
      default:
        throw new Error(`未知的消息场景: ${String((target as MessageTarget | undefined)?.scene)}`);
    }
  }
}

/** 校验键盘规模（最多 5 行 × 5 列） */
export function assertKeyboardSize(keyboard: Keyboard): void {
  const rows = keyboard.content?.rows ?? [];
  if (rows.length > 5) throw new Error('消息按钮最多 5 行');
  for (const row of rows) {
    if ((row.buttons?.length ?? 0) > 5) throw new Error('每行最多 5 个按钮');
  }
}
