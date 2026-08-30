import type { PluginContextV2 } from '../../src/types/index.ts';

/**
 * api: 2 插件示例
 *
 * - 不再导出 main 函数，也不需要 processingTypes
 * - 导出 init(ctx)，在插件加载时被调用，通过 ctx 注册消息处理器
 */
export function init(ctx: PluginContextV2): void {
  // 群聊与私聊通用的前缀指令
  ctx.register('all', {
    prefix: 'hello',
    handler: (msg) =>
      `你好，${msg.senderId}！你在${msg.isPrivate ? '私聊' : `群 ${msg.groupId ?? ''}`}中说：${
        msg.text || '(空)'
      }`,
  });

  // Markdown 渲染为图片
  ctx.register('all', {
    prefix: 'md',
    handler: async (msg) => {
      if (!msg.text) return '用法：md <markdown 文本>';
      const image = await ctx.util.image.withMarkdown(msg.text);
      return { text: '渲染结果：', image };
    },
  });

  // 仅仅记录消息，不回复（返回 null 不会阻断其他处理器）
  ctx.register('all', {
    match: /^\d+$/,
    handler: (msg) => {
      ctx.logger.debug('helloApi2', `收到纯数字消息: ${msg.content}`);
      return null;
    },
  });

  ctx.onUnload(() => {
    ctx.logger.info('helloApi2', '插件已卸载');
  });
}
