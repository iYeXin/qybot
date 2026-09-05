# QYbot 插件开发文档（api: 3）

插件放在 `plugins/<插件目录>/`，入口导出 `init(ctx)`，在插件加载时被调用。插件通过 `ctx` 注册消息/事件处理器、调用开放接口、使用图片工具。

> 插件**必须是 ESM**（`export` / `import`）。支持 `.ts` / `.mts` / `.mjs` / `.js`（`.js` 也按 ESM 解析）。
> 不再支持 `processingTypes`、插件对象 `main()` 与 CommonJS 的 `require` / `module.exports`。

## 目录结构

```
plugins/
└── my-plugin/
    ├── manifest.json   # 必需
    ├── main.ts         # 入口（推荐 TypeScript）
    └── config.json     # 其他文件（可选）
```

入口解析顺序：`.ts` → `.mts` → `.mjs` → `.js`。

## manifest.json

```json
{
  "api": 3,
  "name": "weather",
  "version": "3.0.0",
  "entry": "./main",
  "author": "iYeXin"
}
```

| 字段      | 类型          | 必填 | 说明                        |
| --------- | ------------- | ---- | --------------------------- |
| `api`     | number        | 是   | 必须为 `3`                  |
| `name`    | string        | 是   | 插件名称（用于日志）        |
| `version` | string/number | 否   | 版本号                      |
| `entry`   | string        | 否   | 入口文件路径，缺省 `./main` |
| `author`  | string        | 否   | 作者                        |

## 最小插件

```ts
import type { PluginContext } from '../../qybot.js';

export function init(ctx: PluginContext) {
  ctx.onMessage('all', { prefix: 'hello', handler: (msg) => `你好，${msg.senderId}！` });
}
```

也支持默认导出：`export default function init(ctx) {}`（可 `async`）。

> 仓库根目录的 `qybot.d.ts` 是插件的类型声明文件（以 `PluginContext` / `MessageContext` 为入口自动生成），
> 用 `import type { ... } from '../../qybot.js'` 引用即可获得完整类型提示（路径按插件目录深度调整；`import type` 在运行时会被完全擦除，不影响加载）。
> 框架更新后可用 `npm run build:types` 重新生成。

## 注册处理器

| 方法                          | 说明                                               |
| ----------------------------- | -------------------------------------------------- |
| `ctx.onMessage(scope, opts)`  | 注册消息处理器                                     |
| `ctx.on(event, handler)`      | 任意网关事件（支持数组）                           |
| `ctx.onInteraction(opts)`     | 互动事件（按钮回调等），可按 `type` 过滤           |
| `ctx.onUnload(cb)`            | 插件卸载/重载时回调                                |

`scope` 取值：`'at'` 群内 @机器人（`GROUP_AT_MESSAGE_CREATE`）/ `'group'` 群全量消息（`GROUP_MESSAGE_CREATE`，需平台开启「接收所有消息」）/ `'c2c'` 单聊（`C2C_MESSAGE_CREATE`）/ `'all'` 全部。

注册选项 `opts`：

| 字段         | 类型               | 说明                                              |
| ------------ | ------------------ | ------------------------------------------------- |
| `groups`     | string \| string[] | 限定生效的群 OpenID（仅群消息有效）               |
| `prefix`     | string \| string[] | 前缀匹配，命中后 `msg.text` 为去掉前缀的内容      |
| `match`      | RegExp             | 正则匹配整条消息，匹配结果在 `msg.match`          |
| `ignoreCase` | boolean            | 前缀是否忽略大小写，默认 false（match 请用 /i）   |
| `handler`    | (msg) => 内容      | 处理函数，可为 async                              |

- `prefix` 与 `match` 互斥，同时传会在注册时直接抛错；都不填时接收该作用域的全部消息
- `handler` 缺失、空 `prefix` / 空 `groups` 数组同样会在注册时抛错，而不是等到分发出错

**分发规则**：按注册顺序执行**所有命中**的处理器，每个返回非空结果的处理器都会回复一条；返回 `null` / `undefined` / 空串不回复，也不阻断后续处理器。单个处理器的异常或发送失败只跳过自己。

> 同一条消息的被动回复次数超限（群 5 次 / 单聊 4 次）后，框架会自动去掉 `msg_id` / `event_id`，转为主动消息发出。

## 消息上下文 `msg`

```ts
{
  event,            // GROUP_AT_MESSAGE_CREATE / GROUP_MESSAGE_CREATE / C2C_MESSAGE_CREATE
  content,          // 消息全文（群 @ 消息已去除 @ 前缀）
  text,             // 有效文本（prefix 模式下为去掉前缀后的内容）
  match, prefix,    // 匹配信息
  messageId,        // 消息 ID（被动回复 / 撤回）
  eventId,          // 事件 ID（事件被动回复）
  groupOpenid,      // 群 OpenID
  senderId,         // 发送者标识（群=member_openid，单聊=user_openid）
  userOpenid, memberOpenid, nickname, memberRole,
  isGroup, isPrivate,
  timestamp, messageType, messageScene,
  attachments,      // 图片/视频/语音/文件附件
  mentions, arkData, msgElements,
  raw,              // 原始事件数据

  reply(content),   // 被动回复本条消息（自动维护 msg_seq）
  send(content),    // 主动发送到当前会话
  api, logger,
}
```

## 处理器返回值

```ts
return '纯文本';

return { text: '说明文字', image: buffer };      // image: Buffer 或图片 URL
return { markdown: '# 标题\n**加粗**' };          // Markdown 消息
return { markdown: {...}, keyboard: {...} };      // Markdown + 按钮
return { text: 'hi', keyboard: {...} };           // 文本 + 按钮
return null;                                      // 不回复
```

`image` 为 Buffer 时框架自动分片上传并发送富媒体；同时给 `text` 与 `image` 时会先发文本再发图片。

- `text` 与 `markdown` 同时存在时只发送 Markdown（平台要求二者互斥）
- 内容拆成多条时，被动回复的 `msg_seq` 会自动递增，无需手动处理
- `msgSeq` / `wakeup` 也可直接写在返回值里（`wakeup` 仅单聊主动消息有效）
- 若已在函数内手动 `reply`/`send`，请返回 `null`，否则自动回复会造成重复发送

## 事件上下文 `event`

```ts
ctx.on('GROUP_ADD_ROBOT', (e) => '大家好！');      // 支持用 event_id 回复的事件
ctx.on('FRIEND_ADD', (e) => { ctx.logger.info('x', e.data); });
ctx.on(['GROUP_DEL_ROBOT', 'GROUP_MSG_REJECT'], (e) => { /* 清理状态 */ });
```

`e` 包含 `event` / `eventId` / `data` / `timestamp` / `api` / `logger`，支持回复的事件会带 `e.reply(content)`。

支持事件被动回复的事件：`INTERACTION_CREATE`、`GROUP_ADD_ROBOT`、`GROUP_MSG_RECEIVE`（群）、`C2C_MSG_RECEIVE`、`FRIEND_ADD`（单聊）。

> 不支持回复的事件（如 `GROUP_DEL_ROBOT`）即使返回内容也不会发送，框架会告警并继续尝试后续处理器。

## 互动（按钮回调）

```ts
ctx.onInteraction({
  type: 11,                   // 可选：只处理按钮回调，不填则接收全部互动事件
  handler: async (i) => {
    await i.respond();        // 必须回应，否则客户端一直 loading
    return `你点击了 ${i.buttonData}`;
  },
});
```

`i` 包含 `id` / `type` / `scene` / `buttonData` / `buttonId` / `messageId` / `groupOpenid` / `userOpenid` / `memberOpenid` / `raw`，以及 `respond(code?)` 与 `reply(content)`。

> `type=11`（按钮）与 `type=12`（快捷菜单）必须回应；若插件未回应，框架会自动补一次 `code=0`。

## 上下文总览

```ts
ctx = {
  logger,                 // logger.info(module, msg) / error / warn / debug
  manifest,               // 插件声明内容
  dir,                    // 插件目录绝对路径
  api: {
    message, media, group, bot, guild, panel, menu,
    client,               // 底层 HTTP 客户端（未封装接口可自行调用）
  },
  util: {
    markdownToHTML(md),
    image: { withMarkdown(md, opts?), withHTML(html, opts?) },
  },
  onMessage, on, onInteraction, onUnload,
};
```

## 开放接口示例

```ts
// 主动推送到群
await ctx.api.message.send({ scene: 'group', id: groupOpenid }, '定时播报');

// 主动推送到用户（含互动召回）
await ctx.api.message.send({ scene: 'user', id: userOpenid }, '好久不见', { wakeup: true });

// 单聊流式消息（首片不传 streamMsgId）
const first = await ctx.api.message.sendStream(userOpenid, { index: 0, content: '正在思考' });
await ctx.api.message.sendStream(userOpenid, {
  index: 1, streamMsgId: first.id, content: '正在思考…完成', inputState: 10,
});

// 上传并发送本地图片
const uploaded = await ctx.api.media.uploadBuffer('group', groupOpenid, buffer, { fileType: 1 });
await ctx.api.message.send({ scene: 'group', id: groupOpenid }, { media: { file_info: uploaded.file_info } });

// 撤回消息（2 分钟内）
await ctx.api.message.recallGroup(groupOpenid, messageId);

// 群管理
const info = await ctx.api.group.info(groupOpenid);
const { items } = await ctx.api.group.members(groupOpenid);
await ctx.api.group.setMemberMute(groupOpenid, [{ op: 'add', member_openid: id, mute_expire_at: expireAt }]);
await ctx.api.group.approveJoinRequest(groupOpenid, memberOpenid, { op: 'approve', joinRequestId });

// 机器人信息 / 分享链接
const me = await ctx.api.bot.me();
const link = await ctx.api.bot.generateUrlLink('from-hello');

// 指令面板（c2c/group/channel/dm）
const panelId = await ctx.api.panel.create({
  scope: 'group',
  panel: { items: [{ name: '签到', type: 'command' }] },
});

// 自定义菜单（仅单聊，全局）
await ctx.api.menu.set([{ name: '帮助', type: 'send_message', send_message: '/help' }]);

// 任意未封装接口
await ctx.api.client.post('/v2/...', body);
```

失败会抛出 `QQApiError`，含 `code`（err_code）、`status`、`traceId`（排查时提供给平台）。

## 图片渲染

```ts
const image = await ctx.util.image.withMarkdown('# 标题\n- 内容', { imgOptions: { width: 600 } });
return { image };
```

选项：`width` / `height` / `type` / `quality` / `fullPage` / `transparent` / `deviceScaleFactor` / `timeout` / `waitFor`。

## 热重载与打包

- 修改插件目录或放入 ZIP 包后，框架 1 秒防抖自动重载；重载前执行 `onUnload` 回调
- 重载导致事件订阅变化时，框架会自动重新鉴权网关，使新 `intents` 生效
- ZIP 包内必须且只能有一个顶级目录，安装完成后自动删除 ZIP

## TypeScript 注意

Node 使用类型剥离运行 `.ts`，请勿使用 `enum`、`namespace`、构造函数参数属性等需要代码转换的语法；类型导入请写 `import type`：

```ts
import type { PluginContext, MessageContext } from '../../qybot.js';

export function init(ctx: PluginContext): void {
  ctx.onMessage('at', { prefix: 'hi', handler: (msg: MessageContext) => '你好' });
}
```

## 内置示例

- `plugins/hello` — 前缀指令、Markdown+按钮、全量群消息、互动回调、进群/加好友事件
- `plugins/image-demo` — 图片渲染、主动推送
