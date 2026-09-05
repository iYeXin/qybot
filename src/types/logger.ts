/** 日志级别 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'plugin';

/** 日志器接口 */
export interface Logger {
  error(module: string, message: unknown, ...args: unknown[]): void;
  warn(module: string, message: unknown, ...args: unknown[]): void;
  info(module: string, message: unknown, ...args: unknown[]): void;
  debug(module: string, message: unknown, ...args: unknown[]): void;
  plugin(module: string, message: unknown, ...args: unknown[]): void;
}
