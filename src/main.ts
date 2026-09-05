import { VERSION } from './config.ts';
import { QQBot } from './core/bot.ts';
import { logger } from './core/logger.ts';

/** 最低 Node 版本：22.18.0 起可直接运行 TypeScript */
const MIN_NODE = [22, 18, 0];

/** 检查 Node 版本 */
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
    `Node 版本过低：当前 ${process.versions.node}，需要 >= ${MIN_NODE.join('.')}（用于直接运行 TypeScript）`
  );
  process.exit(1);
}

process.on('uncaughtException', (error: Error) => {
  logger.error('CRASH', `未捕获异常: ${error.stack ?? error.message}`);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('CRASH', `未处理的 Promise 拒绝: ${String(reason)}`);
});

const bot = new QQBot();
bot.registerSignals();

logger.info('BOT', `QYbot v${VERSION} 启动中 (Node ${process.versions.node})`);

bot.start().catch((error: Error) => {
  logger.error('BOT', `启动失败: ${error.message}`);
  process.exit(1);
});
