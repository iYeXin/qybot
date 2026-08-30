import { VERSION } from './config.ts';
import { QQBot } from './core/bot.ts';
import { createPluginContextV1 } from './core/context.ts';
import { logger } from './core/logger.ts';

/** 注入到 api: 1 插件的共享上下文 */
const pluginContext = createPluginContextV1();

/** 最低 Node 版本：22.18.0 起可直接运行 TypeScript */
const MIN_NODE = [22, 18, 0];

/** 检查 Node 版本是否满足要求 */
function checkNodeVersion(): boolean {
  const current = process.versions.node.split('.').map((part) => Number(part) || 0);

  for (let i = 0; i < MIN_NODE.length; i++) {
    const value = current[i] ?? 0;
    if (value !== MIN_NODE[i]) return value > MIN_NODE[i];
  }
  return true;
}

if (!checkNodeVersion()) {
  logger.error(
    'BOT',
    `Node 版本过低：当前 ${process.versions.node}，需要 >= ${MIN_NODE.join('.')}`
  );
  process.exit(1);
}

const bot = new QQBot(pluginContext);
bot.registerSignals();

logger.info('BOT', `QYbot v${VERSION} 启动中 (Node ${process.versions.node})`);

bot.init().catch((error: Error) => {
  logger.error('BOT', `启动失败: ${error.message}`);
  process.exit(1);
});
