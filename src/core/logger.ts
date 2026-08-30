import type { Logger } from '../types/index.ts';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'plugin';

const COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // 红色
  warn: '\x1b[33m', // 黄色
  info: '\x1b[36m', // 青色
  debug: '\x1b[32m', // 绿色
  plugin: '\x1b[35m', // 紫色
};

const RESET = '\x1b[0m';

/** 格式化为 YYYY-MM-DD HH:mm:ss */
function timestamp(): string {
  const now = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const time = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  return `${date} ${time}`;
}

function print(level: LogLevel, module: string, message: unknown, args: unknown[]): void {
  const color = COLORS[level] ?? COLORS.info;
  const prefix = `${color}[${timestamp()}] [${level.toUpperCase()}] [${module}]${RESET}`;
  if (args.length > 0) {
    console.log(prefix, message, ...args);
  } else {
    console.log(prefix, message);
  }
}

/** 全局日志器 */
export const logger: Logger = {
  error(module: string, message: unknown, ...args: unknown[]): void {
    print('error', module, message, args);
  },
  warn(module: string, message: unknown, ...args: unknown[]): void {
    print('warn', module, message, args);
  },
  info(module: string, message: unknown, ...args: unknown[]): void {
    print('info', module, message, args);
  },
  debug(module: string, message: unknown, ...args: unknown[]): void {
    print('debug', module, message, args);
  },
  plugin(module: string, message: unknown, ...args: unknown[]): void {
    print('plugin', module, message, args);
  },
};
