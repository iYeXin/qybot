import MarkdownIt from 'markdown-it';
import type { MarkdownOptions } from '../types/index.ts';

/** GitHub 暗色主题样式 */
const DEFAULT_STYLE = `
      body {
       /*类 GitHub 暗色风格 */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Microsoft YaHei", sans-serif;
      line-height: 1.6;
      color: #c9d1d9;
      padding: 35px;
      margin: 0 auto;
      background: #0d1117; 
      }

      h1, h2, h3, h4, h5, h6 {
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      font-weight: 600;
      line-height: 1.25;
      color: #e6edf3; 
      }

      p {
      margin-top: 0;
      margin-bottom: 1em;
      }

      a {
      color: #58a6ff; 
      text-decoration: none;
      }
      a:hover {
      text-decoration: underline;
      }

      code {
      background-color: #161b22; 
      border-radius: 6px;
      padding: 0.2em 0.4em;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      color: #c9d1d9;
      }

      pre {
      background-color: #161b22; 
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      font-size: 14px;
      line-height: 1.45;
      border: 1px solid #30363d; 
      }
      pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      }

      img {
      max-width: 100%;
      border-radius: 6px; 
      }

      blockquote {
      border-left: 4px solid #3fb950; 
      padding: 0 1em;
      color: #8b949e; 
      margin-left: 0;
      background: rgba(56, 139, 253, 0.1); 
      }

      table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
      border: 1px solid #30363d;
      overflow: hidden;
      }

      th, td {
      border: 1px solid #30363d;
      padding: 6px 13px;
      text-align: left;
      }

      th {
      background-color: #161b22; 
      font-weight: 600;
      }
`;

/**
 * 将 Markdown 转换为 HTML
 * @param markdownText Markdown 文本
 * @param options 配置选项
 * @returns 生成的完整 HTML 文档
 */
export function md2html(markdownText: string, options: MarkdownOptions = {}): string {
  const { html = true, linkify = true, typographer = true, plugins = [] } = options;

  const md = new MarkdownIt({ html, linkify, typographer });

  for (const plugin of plugins) {
    if (!plugin) continue;
    if (Array.isArray(plugin)) {
      (md.use as (...args: unknown[]) => MarkdownIt)(...plugin);
    } else {
      (md.use as (...args: unknown[]) => MarkdownIt)(plugin);
    }
  }

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${DEFAULT_STYLE}</style>
    </head>
    <body>
      ${md.render(markdownText)}
    </body>
    </html>
  `;
}
