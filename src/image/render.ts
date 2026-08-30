import { logger } from '../core/logger.ts';
import { browserPool } from './browser.ts';
import { md2html } from './markdown.ts';
import type { Html2ImgOptions, Md2ImgOptions } from '../types/index.ts';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 将 HTML 转换为图片
 * @param htmlContent HTML 内容
 * @param options 渲染配置
 * @returns 图片 Buffer
 */
export async function html2img(htmlContent: string, options: Html2ImgOptions = {}): Promise<Buffer> {
  const {
    width = 450,
    height,
    quality = 90,
    type = 'png',
    fullPage = true,
    transparent = false,
    deviceScaleFactor = 2,
    timeout = 30000,
    waitFor = 0,
  } = options;

  const browser = await browserPool.getBrowser();
  let page: Awaited<ReturnType<typeof browser.newPage>> | null = null;

  try {
    page = await browser.newPage({
      viewport: { width, height: height ?? 600 },
      deviceScaleFactor,
    });

    await page.setContent(htmlContent, { waitUntil: 'networkidle', timeout });

    if (waitFor > 0) await sleep(waitFor);

    // 自动计算内容高度（非整页模式裁剪时使用）
    const contentHeight = await page.evaluate(() =>
      Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      )
    );

    // fullPage 与 clip 互斥，二选一
    if (fullPage) {
      return await page.screenshot({
        type,
        quality: type === 'jpeg' ? quality : undefined,
        omitBackground: transparent,
        fullPage: true,
        timeout,
      });
    }

    return await page.screenshot({
      type,
      quality: type === 'jpeg' ? quality : undefined,
      omitBackground: transparent,
      timeout,
      clip: { x: 0, y: 0, width, height: Math.min(contentHeight, height ?? contentHeight) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('IMG', `截图失败: ${message}`);
    throw new Error(`Screenshot failed: ${message}`);
  } finally {
    if (page && !page.isClosed()) await page.close();
  }
}

/**
 * 将 Markdown 直接转换为图片
 * @param markdownText Markdown 文本
 * @param options 转换配置
 * @returns 图片 Buffer
 */
export async function md2img(markdownText: string, options: Md2ImgOptions = {}): Promise<Buffer> {
  const { mdOptions = {}, imgOptions = {} } = options;
  return await html2img(md2html(markdownText, mdOptions), imgOptions);
}
