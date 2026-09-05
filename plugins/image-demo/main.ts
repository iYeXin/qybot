import type { PluginContext } from '../../qybot.js';

/**
 * 图片生成示例（api: 3）
 *
 * 用 ctx.util.image 把 Markdown / HTML 渲染成图片，
 * 直接把 Buffer 放进 image 字段，框架会自动上传并发送富媒体消息。
 */
export function init(ctx: PluginContext): void {
  ctx.onMessage('all', {
    prefix: 'md',
    handler: async (msg) => {
      if (!msg.text) return '用法：md <markdown 文本>';
      const image = await ctx.util.image.withMarkdown(msg.text, {
        imgOptions: { width: 600 },
      });
      return { image };
    },
  });

  ctx.onMessage('all', {
    prefix: 'html',
    handler: async (msg) => {
      if (!msg.text) return '用法：html <html 内容>';
      const image = await ctx.util.image.withHTML(
        `<div style="padding:24px;background:#0d1117;color:#c9d1d9">${msg.text}</div>`,
        { width: 600 }
      );
      return { image };
    },
  });

  // 主动推送示例：proactive <群OpenID> <内容>
  ctx.onMessage('c2c', {
    prefix: 'push',
    handler: async (msg) => {
      const [groupOpenid, ...rest] = msg.text.split(' ');
      const content = rest.join(' ').trim();
      if (!groupOpenid || !content) return '用法：push <群OpenID> <内容>';

      const [sent] = await ctx.api.message.send({ scene: 'group', id: groupOpenid }, content);
      return `已推送，消息 ID: ${sent?.id ?? '-'}`;
    },
  });
}
