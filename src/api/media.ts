import { createHash } from 'node:crypto';
import { httpFetch, type ApiClient } from './client.ts';
import { FileType } from '../types/message.ts';

/** 上传场景（群聊与单聊的文件不互通） */
export type MediaScene = 'group' | 'user';

/** 上传结果 */
export interface UploadResult {
  file_uuid?: string;
  /** 透传给发送接口 media.file_info，有有效期（ttl） */
  file_info?: string;
  ttl?: number;
  /** srv_send_msg=true 时返回的消息 ID */
  id?: string;
  /** 分片合并且为图片/视频/语音时的下载地址 */
  raw_url?: string;
}

/** 预上传响应 */
interface PrepareResult {
  upload_id?: string;
  block_size?: string;
  parts?: Array<{ index?: number; presigned_url?: string; block_size?: string }>;
  upload_config?: { concurrency?: number; retry_timeout?: number; retry_delay?: number };
}

/** md5_10m 计算范围：文件前 10002432 字节（约 9.54MiB） */
const MD5_10M_SIZE = 10002432;

const md5 = (data: Buffer): string => createHash('md5').update(data).digest('hex');
const sha1 = (data: Buffer): string => createHash('sha1').update(data).digest('hex');

/**
 * 富媒体上传
 *
 * 推荐分片上传（无需公网地址）：
 * upload_prepare -> 分片 PUT 预签名 URL -> upload_part_finish -> files 合并
 *
 * 单聊与群聊的 file_info 隔离，不能跨场景使用。
 */
export class MediaApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** URL 直传：平台下载转存 */
  async uploadByUrl(
    scene: MediaScene,
    targetId: string,
    options: {
      url: string;
      fileType?: number;
      fileName?: string;
      /** true=直接发送并占用主动消息频次 */
      srvSendMsg?: boolean;
    }
  ): Promise<UploadResult> {
    return await this.client.post<UploadResult>(`/${this.scopePath(scene, targetId)}/files`, {
      file_type: options.fileType ?? FileType.IMAGE,
      url: options.url,
      srv_send_msg: options.srvSendMsg ?? false,
      ...(options.fileName ? { file_name: options.fileName } : {}),
    });
  }

  /**
   * 分片上传本地 Buffer（图片/视频/语音/文件）
   * @param scene 群聊或单聊
   * @param targetId group_openid 或 user_openid
   * @param data 文件二进制内容
   */
  async uploadBuffer(
    scene: MediaScene,
    targetId: string,
    data: Buffer,
    options: { fileType?: number; fileName?: string; concurrency?: number } = {}
  ): Promise<UploadResult> {
    const fileType = options.fileType ?? FileType.IMAGE;
    const fileName = options.fileName ?? `qybot-${Date.now()}`;
    const prefix = this.scopePath(scene, targetId);

    // 1. 预上传
    const prepared = await this.client.post<PrepareResult>(`/${prefix}/upload_prepare`, {
      file_type: fileType,
      file_size: String(data.length),
      file_name: fileName,
      md5: md5(data),
      sha1: sha1(data),
      md5_10m: md5(data.subarray(0, Math.min(MD5_10M_SIZE, data.length))),
    });

    const uploadId = prepared.upload_id;
    const parts = prepared.parts ?? [];
    if (!uploadId || parts.length === 0) {
      throw new Error('预上传失败：未返回 upload_id 或分片信息');
    }

    const blockSize = Number(prepared.block_size ?? parts[0]?.block_size ?? 0) || 0;
    const concurrency = Math.max(1, options.concurrency ?? prepared.upload_config?.concurrency ?? 1);

    // 2 + 3. 分片 PUT 并逐片确认（按并发度分批）
    for (let i = 0; i < parts.length; i += concurrency) {
      const batch = parts.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (part) => {
          const index = part.index ?? 0;
          const size = Number(part.block_size ?? blockSize) || blockSize;
          const start = blockSize > 0 ? index * blockSize : 0;
          const chunk = data.subarray(start, start + size);

          if (!part.presigned_url) throw new Error(`分片 ${index} 缺少上传地址`);

          const response = await httpFetch(
            part.presigned_url,
            { method: 'PUT', body: new Uint8Array(chunk) },
            60000
          );
          if (!response.ok) {
            throw new Error(`分片 ${index} 上传失败: HTTP ${response.status}`);
          }

          await this.client.post(`/${prefix}/upload_part_finish`, {
            upload_id: uploadId,
            part_index: index,
            block_size: String(chunk.length),
            md5: md5(chunk),
          });
        })
      );
    }

    // 4. 合并
    return await this.client.post<UploadResult>(`/${this.scopePath(scene, targetId)}/files`, {
      file_type: fileType,
      srv_send_msg: false,
      file_name: fileName,
      upload_id: uploadId,
    });
  }

  /** 上传图片的便捷方法 */
  async uploadImage(scene: MediaScene, targetId: string, data: Buffer, fileName?: string): Promise<UploadResult> {
    return await this.uploadBuffer(scene, targetId, data, {
      fileType: FileType.IMAGE,
      ...(fileName ? { fileName } : {}),
    });
  }

  /**
   * 场景路径（值为 group_openid / user_openid）
   * 注：官方把预上传接口的路径参数命名为 group_id / user_id，但与此处是同一个值。
   */
  private scopePath(scene: MediaScene, targetId: string): string {
    return scene === 'group' ? `v2/groups/${targetId}` : `v2/users/${targetId}`;
  }
}
