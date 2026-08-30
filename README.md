# QYbot - 轻量级 QQ 机器人框架

QYbot 是一个接入 QQ 官方机器人的轻量级、模块化 QQ 机器人框架。2.0 版本使用 **TypeScript + ESM** 重写主体，由 Node 直接运行 TypeScript（无需编译步骤），并提供了全新一代插件 API（同时完整兼容旧插件）。

## 2.0 版本变化

| 项目 | 1.x | 2.0 |
| --- | --- | --- |
| 主体语言 | JavaScript (CommonJS) | **TypeScript (ESM)**，Node 直接运行 |
| Node 要求 | 无明确要求 | **>= 22.18.0** |
| 图片渲染 | puppeteer-core + 手动定位 Chrome | **playwright-core**，自动尝试系统 Chrome / Edge |
| 插件 API | `processingTypes` + `main()` | 新增 **`api: 2`**（`ctx.register` 事件式），`api: 1` 旧插件继续可用 |
| 插件语言 | JavaScript (CJS) | **TypeScript / JavaScript，ESM 或 CommonJS** |
| 网关地址 | 区分沙箱环境 | 统一 `api.sgroup.qq.com/gateway`（平台新政策） |

## 核心特性

- **双插件 API** - 新版 `api: 2`（推荐）与旧版 `api: 1`（零改动兼容）可共存
- **原生 TypeScript** - 插件可直接用 `.ts` 编写，无需构建
- **图文混合回复** - 支持文本 + 图片组合消息
- **自动浏览器探测** - 依次尝试系统 Chrome / Edge，失败信息完整汇总
- **插件热重载** - 插件目录或 ZIP 包变更时自动重载
- **插件市场** - [QYbot 插件市场](https://market.qybot.yexin.wiki/)

## 环境要求

- **Node.js >= 22.18.0**（用于直接运行 TypeScript，无需 `tsc` 编译）
- 可选：系统安装 **Chrome 或 Edge**（仅图片渲染功能需要）

## 快速开始

### 1. 准备机器人

1. 在 [QQ 开放平台](https://q.qq.com/) 注册并创建机器人
2. 获取 `AppId` 与 `AppSecret`
3. 在机器人管理端配置好可被 @ 的群 / 私聊权限

### 2. 安装与配置

```bash
git clone https://github.com/iYeXin/qybot
cd qybot
npm install
```

编辑 `src/config.ts`：

```ts
export const botConfig: BotConfig = {
  appId: 'xxxxxxx', // 替换为你的 AppId
  secret: 'xxxxxxx', // 替换为你的 AppSecret
  imageServer: 'https://market.qybot.yexin.wiki/upload-image/', // 图片上传接口
  browser: {
    channel: [], // 留空 = 自动探测 Chrome / Edge
    executablePath: '', // 或手动指定浏览器路径
  },
};
```

> `sandBox` 字段已废弃：QQ 开放平台新政策下不再区分沙箱/正式环境，统一使用 `api.sgroup.qq.com/gateway`。

[imageServer 接口规范](./imageServer.md)

### 3. 启动

```bash
npm start        # 等价于 node src/main.ts
npm run typecheck # 可选：类型检查
```

Windows 用户也可双击 `start.bat`。

成功启动后会看到：

```
[2026-08-30 18:20:00] [INFO] [BOT] QYbot v2.0.0 启动中 (Node 22.18.0)
[2026-08-30 18:20:00] [INFO] [PLUGIN] 插件加载完成，共加载 3 个插件
[2026-08-30 18:20:01] [INFO] [WS] 连接成功
```

## 目录结构

```
qybot/
├── src/                      # 框架主体（TypeScript / ESM）
│   ├── main.ts               # 入口
│   ├── config.ts             # 机器人配置
│   ├── types/index.ts        # 公共类型（插件可引用）
│   ├── core/
│   │   ├── bot.ts            # QQ 机器人主类（连接、心跳、消息分发）
│   │   ├── plugin-manager.ts # 插件加载 / 热重载 / 分发
│   │   ├── plugin-loader.ts  # 模块解析（TS/JS、ESM/CJS 兼容）
│   │   ├── registry.ts       # api: 2 消息处理器注册中心
│   │   ├── context.ts        # 插件上下文构造
│   │   ├── logger.ts         # 日志
│   │   └── paths.ts          # 路径常量
│   ├── api/
│   │   ├── http.ts           # 统一请求实例
│   │   └── qq.ts             # QQ 官方接口封装
│   └── image/
│       ├── browser.ts        # playwright-core 浏览器池
│       ├── markdown.ts       # Markdown -> HTML
│       ├── render.ts         # HTML/Markdown -> 图片
│       └── upload.ts         # 图片 Buffer -> URL
├── plugins/                  # 插件目录
│   ├── package.json          # 声明插件目录为 CommonJS，保证旧插件可用
│   └── hello-api2/           # api: 2 插件示例（TypeScript / ESM）
├── tsconfig.json
└── package.json
```

## 图片渲染

图片由 `playwright-core` 渲染，启动时会按顺序尝试：

1. `channel`: 系统自带的 **Chrome** → **Edge** → Playwright chromium
2. `executablePath`: `CHROME_PATH` / `EDGE_PATH` 环境变量或 `botConfig.browser.executablePath`
3. 各平台常见安装路径兜底

每种方式失败都会被捕获并记录，全部失败时抛出汇总错误（列出每种方式的失败原因），不会中断机器人运行。浏览器实例会被复用，空闲 30 秒后自动关闭。

## 插件开发

- **新版插件（推荐）**：见 [plugins.md - api: 2](./plugins.md)
- **旧版插件**：无需任何改动即可继续使用，见 [plugins.md - api: 1](./plugins.md)

## 常见问题

### 提示 Node 版本过低

升级到 Node >= 22.18.0（该版本起默认开启 TypeScript 类型剥离，可直接运行 `.ts`）。

### 图片生成失败

查看日志中 `浏览器启动失败 (...)` 的记录，确认本机已安装 Chrome 或 Edge；也可通过 `CHROME_PATH` 环境变量或 `botConfig.browser.executablePath` 手动指定，或在 `botConfig.browser.channel` 中指定优先尝试的通道。

### 从 1.x 升级

1. 把 `app.js` 中的配置迁移到 `src/config.ts`
2. 删除旧的 `main.js` / `api.js` / `image.js` / `toImg.js`（已被 `src/` 取代）
3. `plugins/` 目录无需改动

## 许可证

[MIT](./LICENSE)
