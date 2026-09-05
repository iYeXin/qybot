import type { Html2ImgOptions, MarkdownOptions, Md2ImgOptions } from './image.ts';

/** 图片与 Markdown 工具集 */
export interface PluginUtils {
  /** Markdown -> HTML 字符串 */
  markdownToHTML: (markdownText: string, options?: MarkdownOptions) => string;
  image: {
    /** Markdown -> 图片 Buffer */
    withMarkdown: (markdownText: string, options?: Md2ImgOptions) => Promise<Buffer>;
    /** HTML -> 图片 Buffer */
    withHTML: (htmlContent: string, options?: Html2ImgOptions) => Promise<Buffer>;
  };
}
