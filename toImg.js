const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const markdownIt = require('markdown-it');

// 浏览器池管理器
class BrowserPool {
    constructor() {
        this.browser = null;
        this.lastUsed = 0;
        this.idleTimeout = 30000; // 30秒空闲超时
        this.cleanupTimer = null;
        this.launchPromise = null;
    }

    async getBrowser() {
        // 清理空闲浏览器
        this.scheduleCleanup();

        // 如果浏览器正在启动中，等待启动完成
        if (this.launchPromise) {
            return this.launchPromise;
        }

        // 如果浏览器实例存在且可用，直接返回
        if (this.browser && this.browser.isConnected()) {
            this.lastUsed = Date.now();
            return this.browser;
        }

        // 启动新浏览器实例
        this.launchPromise = this.launchBrowser();
        try {
            this.browser = await this.launchPromise;
            this.lastUsed = Date.now();
            return this.browser;
        } finally {
            this.launchPromise = null;
        }
    }

    async launchBrowser() {
        const executablePath = getChromePath();

        const browser = await puppeteer.launch({
            executablePath,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process' // 减少资源占用
            ],
            timeout: 30000
        });

        // 监听浏览器断开事件
        browser.on('disconnected', () => {
            this.browser = null;
            this.cleanup();
        });

        return browser;
    }

    scheduleCleanup() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
        }

        this.cleanupTimer = setTimeout(() => {
            this.cleanup();
        }, this.idleTimeout);
    }

    async cleanup() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.browser && this.browser.isConnected()) {
            const now = Date.now();
            // 检查是否空闲超时
            if (now - this.lastUsed > this.idleTimeout) {
                try {
                    await this.browser.close();
                } catch (e) {
                    console.warn('Browser close error:', e.message);
                }
                this.browser = null;
            }
        }
    }

    async close() {
        if (this.browser && this.browser.isConnected()) {
            await this.browser.close();
        }
        this.browser = null;
    }
}

// 创建单例浏览器池
const browserPool = new BrowserPool();

// 程序退出时关闭浏览器
process.on('exit', () => browserPool.close());
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

/**
 * 获取本地 Chrome 安装路径
 * @returns {string} Chrome 路径
 * @throws {Error} 如果未找到 Chrome
 */
function getChromePath() {
    // 1. 检查环境变量
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }

    // 2. 常见安装路径回退
    const platform = process.platform;
    const commonPaths = {
        win32: [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
        ],
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
        ],
        linux: [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser'
        ]
    };

    for (const chromePath of commonPaths[platform] || []) {
        if (fs.existsSync(chromePath)) {
            return chromePath;
        }
    }

    throw new Error('Chrome not found. Please install Chrome or set CHROME_PATH environment variable');
}

/**
 * 将 Markdown 转换为 HTML
 * @param {string} markdownText - Markdown 文本
 * @param {object} [options] - 配置选项
 * @returns {string} 生成的 HTML
 */
function md2html(markdownText, options = {}) {
    const {
        html = true,
        linkify = true,
        typographer = true,
        plugins = []
    } = options;

    const md = markdownIt({ html, linkify, typographer });

    // 加载插件
    plugins.forEach(plugin => {
        if (Array.isArray(plugin)) {
            md.use(...plugin);
        } else {
            md.use(plugin);
        }
    });

    // 添加基本样式
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
            body {
             /*类 GitHub 暗色风格 */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #c9d1d9;
            padding: 30px;
            max-width: 800px;
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
      </style>
    </head>
    <body>
      ${md.render(markdownText)}
    </body>
    </html>
  `;
}

/**
 * 将 HTML 转换为图片
 * @param {string} htmlContent - HTML 内容
 * @param {object} [options] - 配置选项
 * @returns {Promise<Buffer>} 图片 Buffer
 */
async function html2img(htmlContent, options = {}) {
    const {
        width = 450,
        height,
        quality = 90,
        type = 'png',
        fullPage = true,
        transparent = false,
        deviceScaleFactor = 2,
        timeout = 30000,
        chromePath,
        waitFor = 0
    } = options;

    // 获取浏览器实例
    const browser = await browserPool.getBrowser();
    let page = null;

    try {
        // 创建新页面
        page = await browser.newPage();

        // 设置视口
        await page.setViewport({
            width,
            height: height || 600,
            deviceScaleFactor,
            isMobile: false
        });

        // 加载 HTML 内容
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout
        });

        // 等待额外时间（如果有设置）
        if (waitFor > 0) {
            await new Promise(resolve => setTimeout(resolve, waitFor));
        }

        // 自动计算高度
        const contentHeight = await page.evaluate(() => {
            return Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
        });

        // 截图选项
        const screenshotOptions = {
            type,
            quality: type === 'jpeg' ? quality : undefined,
            omitBackground: transparent,
            fullPage,
            timeout
        };

        // 设置精确高度（非全屏模式）
        if (!fullPage && height) {
            screenshotOptions.clip = {
                x: 0,
                y: 0,
                width,
                height: Math.min(contentHeight, height)
            };
        }

        // 执行截图
        return await page.screenshot(screenshotOptions);
    } catch (error) {
        throw new Error(`Screenshot failed: ${error.message}`);
    } finally {
        // 关闭页面，但不关闭浏览器
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}

/**
 * 将 Markdown 直接转换为图片
 * @param {string} markdownText - Markdown 文本
 * @param {object} [options] - 配置选项
 * @returns {Promise<Buffer>} 图片 Buffer
 */
async function md2img(markdownText, options = {}) {
    const { mdOptions = {}, imgOptions = {} } = options;

    // 生成 HTML
    const htmlContent = md2html(markdownText, mdOptions);

    // 转换为图片
    return await html2img(htmlContent, imgOptions);
}

// 导出关闭浏览器池的方法（可选）
function closeBrowserPool() {
    return browserPool.close();
}

module.exports = {
    getChromePath,
    md2html,
    html2img,
    md2img,
    closeBrowserPool // 可选，用于手动关闭浏览器
};