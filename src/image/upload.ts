import { botConfig } from '../config.ts';

/** 支持的图片类型魔数 */
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8]);

/** 检测图片 MIME 类型（仅支持 PNG / JPEG） */
export function detectMimeType(buffer: Buffer): string {
  if (buffer.subarray(0, 2).equals(JPEG_HEADER)) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(PNG_HEADER)) return 'image/png';
  throw new Error('Unsupported image format. Only JPEG/PNG allowed');
}

/**
 * 上传图片 Buffer 到图床，换取可访问的图片 URL
 * @param buffer 图片二进制数据
 * @param serviceUrl 图床接口，默认取 botConfig.imageServer
 * @returns 图片 URL
 */
export async function img2Url(
  buffer: Buffer,
  serviceUrl: string = botConfig.imageServer
): Promise<string> {
  const mimeType = detectMimeType(buffer);

  let response: Response;
  try {
    response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
      },
      body: new Uint8Array(buffer),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(`Network error: ${(error as Error).message}`);
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}: ${raw.slice(0, 100)}`);
  }

  try {
    const data = JSON.parse(raw) as { url?: string };
    if (data.url) return data.url;
    throw new Error('Invalid response: Missing URL field');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse server response: ${raw.slice(0, 100)}`);
    }
    throw error;
  }
}
