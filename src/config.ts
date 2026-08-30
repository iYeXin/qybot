import type { BotConfig } from './types/index.ts';

/**
 * 机器人配置
 *
 * 在 [QQ 开放平台](https://q.qq.com/) 创建机器人后，
 * 把 AppId / AppSecret 填入下方即可。
 */
export const botConfig: BotConfig = {
  appId: 'xxxxx',
  secret: 'xxxxx',
  imageServer: 'https://market.qybot.yexin.wiki/upload-image/', // 远程图片上传接口
  browser: {
    // 留空表示自动探测系统自带的 Chrome / Edge
    channel: [],
    executablePath: '',
    idleTimeout: 30000,
    timeout: 30000,
  },
};

/** 框架版本 */
export const VERSION = '2.0.0';
