import type { PluginContext } from '../../qybot.js';

/**
 * 示例插件（api: 3）
 *
 * 插件入口导出 init(ctx)，通过 ctx 注册消息/事件处理器，
 * 处理器返回内容即自动回复；返回 null 表示不回复。
 */
export function init(ctx: PluginContext): void {
  // 群聊 @机器人 与单聊通用：前缀指令
  ctx.onMessage('all', {
    prefix: 'hello',
    handler: (msg) =>
      `你好，${msg.nickname ?? msg.senderId}！你在${msg.isGroup ? `群 ${msg.groupOpenid}` : '私聊'}中说：${
        msg.text || '(空)'
      }`,
  });

  // Markdown + 按钮（仅群内 @机器人）
  ctx.onMessage('at', {
    prefix: 'menu',
    handler: (msg) => ({
      markdown: `## 功能菜单\n\n${msg.nickname ?? ''} 请选择一个操作`,
      keyboard: {
        content: {
          rows: [
            {
              buttons: [
                {
                  id: 'btn_time',
                  render_data: { label: '当前时间', visited_label: '已获取', style: 1 },
                  action: { type: 2, permission: { type: 2 }, data: '/hello 时间', enter: true },
                },
                {
                  id: 'btn_docs',
                  render_data: { label: '打开文档', visited_label: '已打开', style: 0 },
                  action: {
                    type: 0,
                    permission: { type: 2 },
                    data: 'https://bot.q.qq.com/wiki/',
                    unsupport_tips: '当前版本不支持打开链接',
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  });

  // 全量群消息（需在平台为机器人开启「接收所有消息」）
  ctx.onMessage('group', {
    match: /^(早上好|早安)/,
    handler: (msg) => `早上好呀，${msg.nickname ?? ''}！`,
  });

  // 单聊：任意消息兜底
  ctx.onMessage('c2c', {
    handler: (msg) => ({ markdown: `收到：**${msg.content}**` }),
  });

  // 按钮回调
  ctx.onInteraction({
    handler: async (interaction) => {
      await interaction.respond();
      return `你点击了按钮：${interaction.buttonId ?? interaction.buttonData ?? '-'}`;
    },
  });

  // 机器人进群事件
  ctx.on('GROUP_ADD_ROBOT', () => '大家好，我是 QYbot，发送「hello」试试吧！');

  // 用户添加好友事件
  ctx.on('FRIEND_ADD', () => '感谢添加，发送「hello」开始对话。');

  ctx.onUnload(() => {
    ctx.logger.info('hello', '插件已卸载');
  });
}
