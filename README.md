# QYbot - 轻量级 QQ 机器人框架

QYbot 是接入 QQ 官方机器人的轻量级、模块化框架。3.0 版本针对 **QQ 开放平台 V2 API** 重写了连接、鉴权与消息链路，插件 API 重构为 `init(ctx)` 事件式模型。

> 3.0 是**不兼容更新**：不再支持旧版插件 API（`processingTypes` / `main()`）与 CommonJS 插件。

## 3.0 变化速览

| 项目 | 2.x | 3.0 |
| --- | --- | --- |
| 开放平台接口 | `api.sgroup.qq.com`（部分 `/v2` 端点） | 统一 `api.bot.qq.com`，全量 V2 端点 |
| 网关 | 简单重连 | 完整网关状态机：Hello / Identify / Resume / 心跳看门狗 / 错误码恢复策略 |
| 鉴权 | 手动刷新 token | `TokenManager` 自动获取 + 提前刷新 + 并发去重 + 401 自动重试 |
| 错误处理 | 依赖 HTTP 状态码 | 统一解析 `err_code` / `trace_id`，抛出 `QQApiError` |
| intents | 硬编码 `1 << 25` | 按插件注册的事件**自动计算**（可手动覆盖） |
| 消息能力 | 文本 + 图片 | 文本 / **Markdown** / **富媒体（分片上传）** / **按钮 keyboard** / **流式消息** / 撤回 / 引用 / 主动推送 |
| 事件 | 仅消息 | 群消息（含**全量群消息**）、单聊、进群退群、成员增减、入群申请、好友、互动回调… |
| 群管理 | 无 | 成员、黑名单、禁言、入群审批、自动审批策略 |
| 频道 | 无 | 频道/子频道读写、指令面板、自定义菜单 |
| 插件 | `api: 2`，ESM/CJS 均可 | `api: 3`，**仅 ESM**，`init(ctx)` + `ctx.onXxx` |

## 环境要求

- **Node.js >= 22.18.0**（直接运行 TypeScript，无需编译）
- 可选：系统安装 Chrome 或 Edge（仅图片渲染功能需要）

## 快速开始

```bash
git clone https://github.com/iYeXin/qybot
cd qybot
npm install
```

编辑 `src/config.ts`：

```ts
export const botConfig: BotConfig = {
  appId: 'xxxxxxx', // 开放平台获取的 AppId
  secret: 'xxxxxxx', // 开放平台获取的 AppSecret
  apiBase: 'https://api.bot.qq.com',
  // intents 不填：框架按插件注册的事件自动计算
};
```

启动：

```bash
npm start          # node src/main.ts
npm run typecheck  # 类型检查
```

Windows 可双击 `start.bat`。

## 目录结构

```
src/
├── main.ts              入口（Node 版本校验、异常兜底）
├── config.ts            机器人配置
├── types/               公共类型（插件可 import type）
├── core/
│   ├── bot.ts           主类：网关事件 -> 插件分发 -> 消息回复
│   ├── gateway.ts       WebSocket 网关（鉴权/心跳/Resume/重连）
│   ├── intents.ts       intents 位定义与自动计算
│   ├── registry.ts      处理器注册中心
│   ├── context.ts       插件上下文构造
│   ├── plugin-manager.ts 插件加载、ZIP 安装、热重载
│   ├── plugin-loader.ts  ESM 模块解析（TS/JS）
│   ├── logger.ts  paths.ts
├── api/
│   ├── index.ts    QQApi 门面（ctx.api）
│   ├── client.ts   HTTP 客户端（鉴权、err_code、重试、trace_id）
│   ├── token.ts    access_token 自动管理
│   ├── message.ts  消息发送/撤回/流式/互动回应
│   ├── media.ts    富媒体上传（URL 直传 + 分片上传）
│   ├── group.ts    群管理（成员/黑名单/禁言/入群审批）
│   ├── bot.ts      机器人信息、分享链接
│   ├── guild.ts    频道与子频道
│   ├── panel.ts    指令面板、自定义菜单
│   └── errors.ts   错误类型与网关错误码
└── image/          playwright 图片渲染（browser/markdown/render）
```

## 核心能力

### 消息

- 文本（`msg_type=0`）、**Markdown**（`msg_type=2`）、**富媒体**（`msg_type=7`，自动分片上传 Buffer）
- **消息按钮 keyboard**（最多 5 行 × 5 列），按钮回调自动/手动回应
- **单聊流式消息**（`ctx.api.message.sendStream`）
- 引用回复、撤回（2 分钟内）、「输入中」状态
- 被动回复自动维护 `msg_seq`（群 5 次 / 单聊 4 次上限提醒）
- **主动消息**：不传 `msg_id`/`event_id` 即为主动推送；单聊支持 `is_wakeup` 互动召回

### 事件

群 @ 消息、群**全量消息**（平台侧开启「接收所有消息」后）、单聊消息、机器人进/退群、群成员增减、入群申请、好友增删、主动消息开关、互动回调、频道与子频道事件。

### 群管理 / 频道

成员列表与详情、批量移除、黑名单、禁言、入群审批与自动审批策略；频道详情、子频道增删改查、指令面板、自定义菜单。

### 图片渲染

`playwright-core` 自动尝试系统 Chrome → Edge → Playwright chromium，再尝试 `CHROME_PATH` / 配置路径 / 各平台常见路径；每种失败都会被捕获记录，全部失败时汇总报错。实例复用，空闲 30s 关闭。

## 插件开发

见 [plugins.md](./plugins.md)。最小示例：

```ts
// plugins/hello/main.ts
export function init(ctx) {
  ctx.onMessage('all', { prefix: 'hello', handler: (msg) => `你好，${msg.senderId}！` });
}
```

## 从 2.x 升级

1. 插件 manifest 改为 `{"api": 3, "name": "...", "entry": "./main"}`
2. 入口改为 ESM（`export function init(ctx)`），移除 `processingTypes` 与 `main()`
3. 用 `ctx.onMessage(scope, opts) / on / onInteraction` 注册处理器（`scope` 为 `'at'` / `'group'` / `'c2c'` / `'all'`）
4. 旧的 CJS 插件（`require` / `module.exports`）需改写为 ESM

## 常见问题

**提示 Node 版本过低** — 升级到 Node >= 22.18.0。

**网关 4014 / 无权限** — 机器人未申请对应事件权限，或减少注册的事件类型；手动指定 `botConfig.intents` 可绕过自动计算。

**收不到全量群消息** — `GROUP_MESSAGE_CREATE` 需在开放平台为机器人开启「接收所有消息」（群侧 `recv_msg_setting=all`）。

**图片渲染失败** — 查看日志中的 `浏览器启动失败 (...)`，或手动指定 `botConfig.browser.executablePath` / `CHROME_PATH`。

## 许可证

[MIT](./LICENSE)
