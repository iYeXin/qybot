import { existsSync } from 'node:fs';
import { chromium, type Browser, type LaunchOptions } from 'playwright-core';
import { botConfig } from '../config.ts';
import { logger } from '../core/logger.ts';

/** 默认启动参数（容器/服务器友好） */
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

/** 一种可行的浏览器启动方式 */
interface LaunchCandidate {
  label: string;
  options: LaunchOptions;
}

/** 各平台常见浏览器安装位置（channel 不可用时的兜底） */
function commonExecutablePaths(): string[] {
  const localAppData = process.env.LOCALAPPDATA ?? '';
  const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';

  switch (process.platform) {
    case 'win32':
      return [
        `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFiles} (x86)\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      ];
    case 'darwin':
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ];
    default:
      return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/microsoft-edge',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ];
  }
}

/** 归一化配置中的 channel 字段 */
function normalizedChannels(): string[] {
  const configured = botConfig.browser?.channel;
  const channels = Array.isArray(configured)
    ? configured
    : typeof configured === 'string' && configured
      ? [configured]
      : [];

  // 未配置时使用默认顺序：系统 Chrome -> 系统 Edge -> Playwright chromium
  return channels.length > 0 ? channels : ['chrome', 'msedge', 'chromium'];
}

/** 构建全部待尝试的启动方式（按优先级排序） */
function buildCandidates(): LaunchCandidate[] {
  const candidates: LaunchCandidate[] = [];

  // 1. 通过 channel 使用系统自带的 Chrome / Edge
  for (const channel of normalizedChannels()) {
    candidates.push({ label: `channel "${channel}"`, options: { channel } });
  }

  // 2. 环境变量 / 配置中显式指定的可执行文件
  const explicitPath =
    process.env.CHROME_PATH || process.env.EDGE_PATH || botConfig.browser?.executablePath;
  if (explicitPath && existsSync(explicitPath)) {
    candidates.push({ label: `executablePath "${explicitPath}"`, options: { executablePath: explicitPath } });
  }

  // 3. 常见安装路径兜底
  for (const executablePath of commonExecutablePaths()) {
    if (executablePath && existsSync(executablePath)) {
      candidates.push({ label: `executablePath "${executablePath}"`, options: { executablePath } });
    }
  }

  return candidates;
}

/** 浏览器池：复用实例，空闲后自动关闭 */
class BrowserPool {
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastUsed = 0;
  private preferred: LaunchCandidate | null = null;

  private get idleTimeout(): number {
    return botConfig.browser?.idleTimeout ?? 30000;
  }

  private get launchTimeout(): number {
    return botConfig.browser?.timeout ?? 30000;
  }

  /** 获取可用浏览器实例（不存在则启动） */
  async getBrowser(): Promise<Browser> {
    this.scheduleCleanup();

    if (this.launchPromise) return this.launchPromise;

    if (this.browser?.isConnected()) {
      this.lastUsed = Date.now();
      return this.browser;
    }

    this.launchPromise = this.launchBrowser();
    try {
      this.browser = await this.launchPromise;
      this.lastUsed = Date.now();
      return this.browser;
    } finally {
      this.launchPromise = null;
    }
  }

  /** 依次尝试各种启动方式，全部失败后汇总错误信息 */
  private async launchBrowser(): Promise<Browser> {
    const candidates = buildCandidates();
    if (this.preferred) {
      const index = candidates.findIndex((item) => item.label === this.preferred?.label);
      if (index > 0) candidates.unshift(...candidates.splice(index, 1));
      else if (index < 0) candidates.unshift(this.preferred);
    }

    const failures: string[] = [];

    for (const candidate of candidates) {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: LAUNCH_ARGS,
          timeout: this.launchTimeout,
          ...candidate.options,
        });

        this.preferred = candidate;
        logger.info('IMG', `浏览器启动成功 (${candidate.label})`);

        browser.on('disconnected', () => {
          this.browser = null;
          void this.cleanup();
        });

        return browser;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // channel 不存在时短提示即可，完整原因放 debug
        logger.warn('IMG', `浏览器启动失败 (${candidate.label}): ${message.split('\n')[0]}`);
        logger.debug('IMG', message);
        failures.push(`- ${candidate.label}: ${message.split('\n')[0]}`);
      }
    }

    throw new Error(
      [
        '未能启动任何浏览器，图片生成功能不可用。',
        '请安装 Chrome 或 Edge，或通过 CHROME_PATH 环境变量 / botConfig.browser.executablePath 手动指定。',
        '尝试过的启动方式：',
        ...failures,
      ].join('\n')
    );
  }

  /** 安排空闲检测 */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => {
      void this.cleanup();
    }, this.idleTimeout);
  }

  /** 空闲超时后关闭浏览器 */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (!this.browser) return;

    if (this.browser.isConnected() && Date.now() - this.lastUsed > this.idleTimeout) {
      try {
        await this.browser.close();
        logger.debug('IMG', '空闲浏览器已关闭');
      } catch (error) {
        logger.warn('IMG', `浏览器关闭异常: ${(error as Error).message}`);
      }
      this.browser = null;
    }
  }

  /** 立即关闭浏览器 */
  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // 退出阶段忽略关闭异常
      }
      this.browser = null;
    }
  }
}

export const browserPool = new BrowserPool();

/** 关闭浏览器池（供退出流程调用） */
export function closeBrowserPool(): Promise<void> {
  return browserPool.close();
}
