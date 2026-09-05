/** Markdown 转换配置 */
export interface MarkdownOptions {
  /** 允许 HTML 标签，默认 true */
  html?: boolean;
  /** 自动转换 URL 为链接，默认 true */
  linkify?: boolean;
  /** 启用印刷替换，默认 true */
  typographer?: boolean;
  /** markdown-it 插件列表 */
  plugins?: unknown[];
}

/** HTML 转图片配置 */
export interface Html2ImgOptions {
  /** 视口宽度，默认 450 */
  width?: number;
  /** 视口高度，默认 600 */
  height?: number;
  /** 图片质量（1-100，仅 jpeg），默认 90 */
  quality?: number;
  /** 图片格式，默认 png */
  type?: 'png' | 'jpeg';
  /** 是否截取整页，默认 true */
  fullPage?: boolean;
  /** 是否透明背景，默认 false */
  transparent?: boolean;
  /** 设备像素比，默认 2 */
  deviceScaleFactor?: number;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 渲染后额外等待时间（毫秒），默认 0 */
  waitFor?: number;
}

/** Markdown 转图片配置 */
export interface Md2ImgOptions {
  mdOptions?: MarkdownOptions;
  imgOptions?: Html2ImgOptions;
}
