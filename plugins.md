# QYbot 插件开发文档

QYbot 的插件放在 `plugins/<插件目录>/` 下。框架支持两代插件 API，二者可以共存：

| | `api: 1`（旧版 / 缺省） | `api: 2`（新版，推荐） |
| --- | --- | --- |
| manifest | 需 `processingTypes`，入口字段 `mainExport` | 需 `"api": 2`，无需 `processingTypes`，入口字段 `entry` |
| 入口导出 | 与 `name` 同名的插件对象（`main` / `init` / `cleanup`） | `init(ctx)` 函数（具名导出或默认导出） |
| 消息匹配 | 消息的第一个词（消息类型） | `prefix` 前缀 / `match` 正则 / 群 ID 过滤 |
| 注册方式 | 框架按 `processingTypes` 分发 | 插件主动 `ctx.register(...)` |
| 图片工具 | `this.ctx.utils.md2img` 等 | `ctx.util.image.withMarkdown` 等 |
| 卸载 | 插件对象的 `cleanup()` | `ctx.onUnload(cb)` |

> **旧插件无需任何修改**，框架会自动按 `api: 1` 处理。

## 插件市场

你可以在 [QYbot 插件市场](https://market.qybot.yexin.wiki/) 寻找或上传插件。

## 目录结构与文件类型

```
plugins/
└── my-plugin/
    ├── manifest.json   # 插件声明（必需）
    ├── main.ts         # 入口文件（必需，可以是 .ts/.mts/.mjs/.js）
    ├── config.ts       # 其他文件（可选）
    └── data.json
```

入口文件（`manifest.mainExport`）的解析规则：

- 带扩展名时直接使用，例如 `"./main.mjs"`
- 不带扩展名时按 **`.ts` → `.mts` → `.mjs` → `.js`** 的顺序探测

模块类型规则：

| 扩展名 | 模块类型 | 说明 |
| --- | --- | --- |
| `.ts` | **ESM** | 新版插件推荐，框架强制按 ESM 解析 |
| `.mts` | **ESM** | TypeScript ESM |
| `.mjs` | **ESM** | JavaScript ESM |
| `.js` / `.cjs` | **CommonJS** | 兼容旧插件的 `require` / `module.exports` |

**新插件请一律使用 ESM**（`export` / `import`），旧插件的 CommonJS 写法继续可用。

> `plugins/package.json` 中声明了 `"type": "commonjs"`，因此 `.js` 插件保持 CommonJS 语义；
> 框架通过 loader hook 强制 `.ts` 按 ESM 解析，因此 TypeScript 插件请直接使用 ESM 语法。
> 想用 JavaScript 编写新版插件时，请使用 `.mjs` 扩展名。

## manifest.json

### api: 2（新版）

```json
{
  "api": 2,
  "name": "weather",
  "version": "2.0.0",
  "entry": "./main",
  "author": "iYeXin"
}
```

### api: 1（旧版）

```json
{
  "name": "weatherPlugin",
  "version": 1.0,
  "mainExport": "./main",
  "author": "iYeXin",
  "processingTypes": ["天气", "/天气"]
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `api` | Number | 否 | `1`（缺省）或 `2` |
| `name` | String | 是 | 插件名称（api: 1 必须与导出的插件对象同名） |
| `version` | String/Number | 否 | 版本号 |
| `entry` | String | api: 2 必填 | 入口文件相对路径（api: 2 推荐） |
| `mainExport` | String | api: 1 必填 | 入口文件相对路径，缺省 `"./main"`；两种 API 都识别该字段 |
| `author` | String | 否 | 作者（兼容旧拼写 `auther`） |
| `processingTypes` | Array | api: 1 必填 | 处理的消息类型，`"default"` 表示兜底处理所有消息 |

---

# api: 2 插件（推荐）

## 最小示例

```ts
// plugins/hello/main.ts
export function init(ctx) {
  ctx.register('all', {
    prefix: 'hello',
    handler: (msg) => `你好，${msg.senderId}！`,
  });
}
```

`init(ctx)` 在插件加载时**立即被调用**，支持异步（`export default async function init(ctx)`）。导出方式可以是：

```ts
export function init(ctx) {}        // 具名导出
export default function (ctx) {}    // 默认导出
```

CommonJS 插件则可写 `module.exports = function (ctx) {}` 或 `module.exports = { init }`。

## 注册消息处理器

```ts
ctx.register(scope, { groupId?, match?, prefix?, handler });
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `scope` | `'group'` \| `'private'` \| `'all'` | 群聊 / 私聊 / 全部 |
| `groupId` | String / String[] | 可选，限定生效的群 |
| `match` | RegExp | 可选，正则匹配整条消息 |
| `prefix` | String | 可选，前缀匹配 |
| `handler` | `(msg) => 结果消息 \| Promise<结果消息>` | 处理函数 |

`match` 与 `prefix` 都不填时，该处理器会接收对应作用域的**全部消息**（可用于记录日志等，返回 `null` 即不回复，也不会阻断其他处理器）。

快捷写法：

```ts
ctx.onGroup({ prefix: '天气', handler });   // 等价于 ctx.register('group', ...)
ctx.onPrivate({ prefix: '天气', handler }); // 等价于 ctx.register('private', ...)
```

## handler 收到的消息对象

```ts
{
  content: string;     // 消息全文（已去除首尾空白）
  text: string;        // 有效文本：prefix 模式下为去掉前缀后的内容，其余等于 content
  messageId: string;   // 消息 ID
  groupId?: string;    // 群 ID（仅群聊）
  senderId: string;    // 发送者 openid
  isPrivate: boolean;  // 是否私聊
  match?: RegExpMatchArray; // 使用 match 注册时的匹配结果
  prefix?: string;     // 使用 prefix 注册时命中的前缀
}
```

## handler 的返回值

```ts
// 1. 纯文本
return '你好';

// 2. 文本 + 图片（image 可以是 Buffer，也可以是图片 URL 字符串）
return { text: '今天的天气', image: buffer };

// 3. 不回复（继续尝试后续处理器 / 旧版插件）
return null;
```

## 上下文 ctx

```ts
{
  api: 2,
  util: {
    markdownToHTML(markdown, options?): string,        // Markdown -> HTML 字符串
    image: {
      withMarkdown(markdown, options?): Promise<Buffer>, // Markdown -> 图片
      withHTML(html, options?): Promise<Buffer>,         // HTML -> 图片
    },
  },
  logger,      // logger.info(module, message, ...args) / error / warn / debug
  manifest,    // 当前插件的 manifest 内容
  dir,         // 当前插件目录的绝对路径
  register(scope, registration),
  onGroup(registration),
  onPrivate(registration),
  onUnload(callback),  // 插件重载或框架退出时调用
}
```

图片渲染选项：

- `withMarkdown(md, { mdOptions?, imgOptions? })`
- `withHTML(html, { width?, height?, quality?, type?, fullPage?, transparent?, deviceScaleFactor?, timeout?, waitFor? })`

默认值：`width: 450`、`type: 'png'`、`fullPage: true`、`deviceScaleFactor: 2`、`quality: 90`、`timeout: 30000`。

## 完整示例

```ts
// plugins/weather/main.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function init(ctx) {
  // 只处理指定群
  ctx.onGroup({
    groupId: '9A1B2C3D4E',
    prefix: '天气',
    handler: async (msg) => {
      if (!msg.text) return '用法：天气 城市名';
      const data = await queryWeather(msg.text);
      return { text: '查询结果', image: await ctx.util.image.withMarkdown(data) };
    },
  });

  // 正则匹配：任意纯数字消息
  ctx.register('all', {
    match: /^\d+$/,
    handler: (msg) => `你发送了数字 ${msg.content}`,
  });

  // 私聊
  ctx.onPrivate({
    prefix: '帮助',
    handler: () => ctx.util.markdownToHTML('# 帮助\n发送`天气 城市`查询天气'),
  });

  ctx.onUnload(() => {
    ctx.logger.info('weather', '插件已卸载');
  });
}
```

## 分发顺序

1. **api: 2 处理器**按注册顺序依次执行，**第一个返回非空结果**的处理器生效并结束分发
2. 返回 `null` / `undefined` / 空字符串不会阻断后续处理器
3. 没有任何 api: 2 处理器响应时，回退到 **api: 1 插件**（按消息类型匹配，最后交给 `default` 插件）

---

# api: 1 插件（旧版，保持兼容）

无需 `api` 字段。插件导出一个与 `manifest.name` 同名的对象：

```js
// plugins/hello/main.js (CommonJS，照旧可用)
const config = require('./config');

module.exports = {
  helloPlugin: {
    async init() {
      console.log('初始化');
    },

    async main(msgType, msgContent, senderOpenid, isPrivate) {
      return `已处理${isPrivate ? '私聊' : '群聊'}消息: ${msgContent}`;
    },

    async cleanup() {
      console.log('清理资源');
    },
  },
};
```

- 消息格式：`@bot <消息类型> <消息内容>`（群聊）或 `<消息类型> <消息内容>`（私聊）
- 返回值：字符串（纯文本）或 `{ text, image }` 对象
- 上下文：`this.ctx.utils.md2html` / `html2img` / `md2img`、`this.ctx.logger`

---

# 通用机制

## 热重载

`plugins` 目录发生变化（新增/修改插件目录，或放入 ZIP 包）时，框架会在 1 秒防抖后自动重载全部插件；重载前会依次执行 api: 2 的 `onUnload` 回调与 api: 1 插件的 `cleanup()`。

## ZIP 插件包

把插件目录整体打包，**zip 内必须且只能有一个顶级目录**：

```
my-plugin.zip
└── my-plugin/
    ├── manifest.json
    └── main.ts
```

把 zip 直接放进 `plugins/` 目录，框架会自动解压、安装并删除 zip（已存在的同名插件目录会被备份为 `<目录名>_<时间戳>`）。

## TypeScript 插件

- 直接写 `.ts` 即可，无需编译
- 框架使用 Node 的类型剥离运行，因此**请勿使用** `enum`、`namespace`、构造函数参数属性等需要代码转换的语法；类型导入请写 `import type { ... } from '...'`
- 可从框架引用类型（仅类型层面，运行时会被擦除）：

  ```ts
  import type { PluginContextV2 } from '../../src/types/index.ts';

  export function init(ctx: PluginContextV2): void {
    ctx.onGroup({ prefix: 'hi', handler: () => '你好' });
  }
  ```

## 最佳实践

1. **错误兜底**：在 handler 内部 try/catch，返回友好文案；未捕获的异常会被框架记录并跳过该处理器
2. **避免超大图片**：控制 `width`，必要时使用 `type: 'jpeg'` + `quality`
3. **使用远程 URL**：能直接拿到图片链接时返回 URL 字符串，省去上传开销
4. **资源释放**：用 `ctx.onUnload()`（api: 2）或 `cleanup()`（api: 1）释放定时器、连接等
5. **配置外置**：密钥等写入独立的 `config.ts` / `config.json`，不要硬编码
