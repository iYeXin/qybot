# QYbot 插件系统 API

## 概述

QYbot 插件系统采用模块化设计，允许开发者通过插件扩展机器人功能。插件存放在 `/plugins` 目录下，每个插件作为一个独立子目录。当机器人收到 `@bot` 开头的消息时，系统会解析消息类型，并调用相应插件的 `main` 方法处理消息。插件支持返回文本+图片。

## 插件市场

你可以在[QYbot 插件市场](https://market.qybot.yexin.wiki/)寻找或上传插件

## 消息格式规范

用户消息必须遵循以下格式：

```
@bot <消息类型> <消息内容>
```

示例：

```
@bot chat 你好，今天天气如何？
```

- `@bot` 与消息类型之间必须有**一个空格**
- 消息类型与消息内容之间必须有**一个空格**
- 消息内容可以是任意文本

## 插件目录结构

```
/plugins/
  └── plugin-name/          # 插件目录
        ├── manifest.json   # 插件声明文件（必需）
        ├── main.js         # 主程序文件（必需）
        ├── config.js       # 配置文件（可选）
        └── other-files     # 其他支持文件
```

## manifest.json 规范

```json
{
  "name": "pluginObjectName",
  "version": 1.0,
  "mainExport": "./main",
  "auther": "iYeXin", // 可选
  "processingTypes": ["chat", "command", "default"]
}
```

### 字段说明

| 字段名          | 类型   | 必填 | 描述                                                                |
| --------------- | ------ | ---- | ------------------------------------------------------------------- |
| name            | String | 是   | 插件对象名称，必须与导出的插件对象名一致                            |
| version         | Number | 是   | 插件版本号，用于版本管理                                            |
| mainExport      | String | 是   | 插件主文件路径（相对于插件目录），如 `"./main"` 表示 `main.js` 文件 |
| processingTypes | Array  | 是   | 插件处理的消息类型列表，可包含特殊值 `"default"` 表示默认处理器     |

### processingTypes 说明

- 注意：为了适配官方的指令配置，建议在声明时同时声明`"原始指令"`和`"/原始指令"`
- 消息类型匹配是**大小写敏感**的
- 当多个插件声明处理同一消息类型时，**后加载的插件会覆盖**先加载的插件
- 特殊值 `"default"` 表示该插件将处理所有未被其他插件匹配的消息

## 插件对象规范

每个插件必须导出一个与 `manifest.json` 中 `name` 字段同名的对象，该对象应包含以下方法：

### 必需方法：main()

```javascript
/**
 * 插件主处理方法
 * @param {string} msgType - 将传递消息类型（如 "天气"）
 * @param {string} msgContent - 将传递消息内容（消息类型之后的有效文本）
 * @param {string} senderOpenid - 发将传递送者的唯一标识符
 * @returns {Promise<obiect>} 返回处理结果的Promise，结果应该为一个对象，包含`text`字段和`image`字段，text字段放置文本，image字段需放置Buffer类型图片或图片url（无图片返回不设置该字段）
 *
 * 注意：你也可以返回一个字符串的Promise，将作为纯文本消息发送
 */
async function main(msgType, msgContent, senderOpenid) {
  // 插件处理逻辑
  return { text: "文字消息", image: 图片二进制数据 或 图片url };
}
```

说明：你可以在`main方法`中进行任何逻辑处理，包括运算/调用外部 API 等

### `main方法`返回值规范

```javascript
{
  text: "这是回复的文本",
  image: Buffer // 这是回复的图片（Buffer格式），该属性可选
}
```

### 可选方法：init()

```javascript
/**
 * 插件初始化方法（可选）
 * 在插件加载时自动调用，用于执行初始化操作
 */
async function init() {
  console.log("插件初始化完成");
}
```

### 可选方法：cleanup()

```javascript
/**
 * 插件清理方法（可选）
 * 在插件卸载时自动调用，用于释放资源
 */
async function cleanup() {
  console.log("插件清理完成");
}
```

### 完整插件示例

```javascript
// main.js
const config = require("./config");

module.exports = {
  pluginObjectName: {
    async init() {
      console.log(`[${config.PLUGIN_NAME}] 初始化`);
    },

    async main(msgType, msgContent, senderOpenid) {
      console.log(`收到消息: ${msgType} - ${msgContent}`);
      return `已处理: ${msgContent}`;
    },

    async cleanup() {
      console.log(`[${config.PLUGIN_NAME}] 清理资源`);
    },
  },
};
```

## 消息处理流程

1. 用户发送消息：`@bot <msgType> <msgContent>`
2. 主程序解析出消息类型 (`msgType`) 和内容 (`msgContent`)
3. 根据 `msgType` 查找匹配的插件
4. 调用插件对象的 `main()` 方法
5. 插件处理完成后返回回复对象
6. 主程序将回复对象中的文本和图片作为回复消息发送

## 插件包封装

插件包采用`zip`格式，开发者需要将插件目录整体作为`zip包`中的内容（如下）

```
my-plugin.zip/
  └── my-plugin/          # 插件目录
        ├── manifest.json   # 插件声明文件（必需）
        ├── main.js         # 主程序文件（必需）
        ├── config.js       # 配置文件（可选）
        └── other-files     # 其他支持文件
```

**严格禁止**以下结构

```
my-plugin.zip/
├── manifest.json   # 插件声明文件（必需）
├── main.js   # 主程序文件（必需）
├── config.js   # 配置文件（可选）
└── other-files   # 其他支持文件
```

## 最佳实践

1. **错误处理**：

   ```javascript
   async main(msgType, msgContent, senderOpenid) {
     try {
       // 业务逻辑
     } catch (error) {
       console.error("处理失败:", error);
       return "处理消息时出错，请稍后再试";
     }
   }
   ```

2. **配置管理**：

   - 使用单独的 `config.js` 文件管理配置
   - 避免在代码中硬编码敏感信息

3. **资源管理**：

   - 在 `init()` 中初始化资源
   - 在 `cleanup()` 中释放资源
   - 使用异步方法处理耗时操作

4. **日志记录**：
   - 在关键步骤添加日志记录
   - 包含插件名称前缀以便区分

## 插件开发示例

### 1. 创建插件目录

```
mkdir plugins/hello-plugin
```

### 2. 添加声明文件 (manifest.json)

```json
{
  "name": "helloPlugin",
  "version": 1.0,
  "mainExport": "./main",
  "processingTypes": ["hello", "hi"]
}
```

### 3. 创建主程序 (main.js)

```javascript
// main.js
module.exports = {
  helloPlugin: {
    async main(msgType, msgContent, senderOpenid) {
      return `你好，${senderOpenid}！你说的是: ${msgContent}`;
    },
  },
};
```

### 4. 使用插件

用户发送：

```
@bot hello 这是一条测试消息
```

机器人回复：

```
你好，user-openid！你说的是: 这是一条测试消息
```
