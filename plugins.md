# QYbot 插件系统文档

## 概述

QYbot 插件系统采用模块化设计，允许开发者通过插件扩展机器人功能。插件存放在 `/plugins` 目录下，每个插件作为一个独立子目录。当机器人收到 `@bot` 开头的消息或收到**私聊消息**时，系统会解析消息类型，并调用相应插件的 `main` 方法处理消息。插件支持返回文本+图片组合消息。

## 插件市场

你可以在[QYbot 插件市场](https://market.qybot.yexin.wiki/)寻找或上传插件

## 消息格式规范

用户消息必须遵循以下格式：

```
// 群聊
@bot <消息类型> <消息内容>

// 私聊
<消息类型> <消息内容>

```

示例：

```

@bot chat 你好，今天天气如何？

```

- `@bot(可选)` 与消息类型之间必须有**一个空格**
- 消息类型与消息内容之间必须有**一个空格**
- 消息内容可以是任意文本

## 插件目录结构

```

/plugins/
└── plugin-name/ # 插件目录
├── manifest.json # 插件声明文件（必需）
├── main.js # 主程序文件（必需）
├── config.js # 配置文件（可选）
└── other-files # 其他支持文件

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
 * @param {boolean} isPrivate -是否为私聊消息（true表示私聊，false表示群聊）
 * @returns {Promise<obiect>} 返回处理结果的Promise，结果应该为一个对象，包含`text`字段和`image`字段，text字段放置文本，image字段需放置Buffer类型图片或图片url（无图片返回不设置该字段）
 *
 * 旧版本插件仍可以返回一个字符串的Promise，将作为纯文本消息发送
 */
async function main(msgType, msgContent, senderOpenid, isPrivate) {
  // 插件处理逻辑
  return { text: "文字消息", image: 图片二进制数据 或 图片url };
}
```

说明：你可以在`main方法`中进行任何逻辑处理，包括运算/调用外部 API 等

### `main方法`返回值规范

```javascript
{
  text: "这是回复的文本",
  image: Buffer 或 字符串类型的url // 该属性可选
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

## 插件上下文

插件可在插件对象中通过 `this.ctx` 访问共享资源：

```javascript
// this.ctx
{
  utils: {
    md2html, // Markdown转HTML  传入markdown字符串，返回HTML字符串
    html2img, // HTML转图片   传入HTML字符串，返回buffer类型图片
    md2img,   // Markdown直接转图片   传入markdown字符串，返回buffer类型图片
  }
}
```

### 图片生成工具详解

#### 1. md2html(markdownText, options)

将 Markdown 转换为 HTML

- `markdownText`: Markdown 格式文本
- `options`: 配置选项（可选）
  - `html`: 允许 HTML 标签（默认 true）
  - `linkify`: 自动转换 URL 为链接（默认 true）
  - `typographer`: 启用印刷替换（默认 true）
  - `plugins`: 要加载的 markdown-it 插件数组

#### 2. html2img(htmlContent, options)

将 HTML 转换为图片

- `htmlContent`: HTML 内容
- `options`: 配置选项（可选）
  - `width`: 图片宽度（默认 450，移动端友好）
  - `height`: 图片高度（可选）
  - `quality`: 图片质量（1-100，默认 90）
  - `type`: 图片格式（'png' 或 'jpeg'，默认 'png'）
  - `fullPage`: 是否截取整个页面（默认 true）
  - `transparent`: 是否透明背景（默认 false）
  - `timeout`: 操作超时时间（毫秒，默认 30000）
  - `waitFor`: 额外等待时间（毫秒，默认 0）

#### 3. md2img(markdownText, options)

将 Markdown 直接转换为图片

- `markdownText`: Markdown 格式文本
- `options`: 配置选项（可选）
  - `mdOptions`: md2html 的配置
  - `imgOptions`: html2img 的配置

#### 4. 样式说明

Markdown 转换默认使用类 GitHub 暗色主题样式，开发者可自行通过 HTML 进行配置

### Chrome 支持要求

- 图片生成功能需要系统安装 **Chrome 浏览器**
- 支持 Windows/macOS/Linux 系统
- 自动检测安装路径，也可通过 `CHROME_PATH` 环境变量指定

## 完整插件示例

### 文本插件示例

```javascript
// main.js
const config = require("./config");

module.exports = {
  pluginObjectName: {
    async init() {
      console.log(`[${config.PLUGIN_NAME}] 初始化`);
    },

    async main(msgType, msgContent, senderOpenid, isPrivate) {
      console.log(
        `收到${isPrivate ? "私聊" : "群聊"}消息: ${msgType} - ${msgContent}`
      );
      return `已处理${isPrivate ? "私聊" : "群聊"}消息: ${msgContent}`;
    },

    async cleanup() {
      console.log(`[${config.PLUGIN_NAME}] 清理资源`);
    },
  },
};
```

### 图片生成插件示例

```javascript
// chart-plugin/main.js
module.exports = {
  chartPlugin: {
    async main(_, content) {
      try {
        // 生成图表SVG
        const chartSVG = generateChart(content);

        // 转换SVG为图片
        const imgBuffer = await this.ctx.utils.html2img(
          `<div style="background:white;padding:20px">${chartSVG}</div>`,
          { width: 800 }
        );

        return {
          text: "数据分析结果：",
          image: imgBuffer,
        };
      } catch (error) {
        return "图表生成失败：" + error.message;
      }
    },
  },
};
```

### Markdown 转图片插件示例

```javascript
// markdown-plugin/main.js
module.exports = {
  markdownPlugin: {
    async main(_, markdownContent) {
      try {
        // 使用上下文工具转换Markdown
        const imgBuffer = await this.ctx.utils.md2img(markdownContent, {
          imgOptions: { width: 600 },
        });

        return {
          text: "转换结果：",
          image: imgBuffer,
        };
      } catch (error) {
        return "转换失败：" + error.message;
      }
    },
  },
};
```

## 消息处理流程

1. 用户发送消息：`@bot <msgType> <msgContent>`(群聊)或`<msgType> <msgContent>`(私聊)
2. 主程序解析出消息类型 (`msgType`) 和内容 (`msgContent`)
3. 根据 `msgType` 查找匹配的插件
4. 调用插件对象的 `main()` 方法
5. 插件处理完成后返回回复对象
6. 主程序将回复消息发送给群聊/用户

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

**不支持**以下结构

```
my-plugin.zip/
├── manifest.json   # 插件声明文件（必需）
├── main.js   # 主程序文件（必需）
├── config.js   # 配置文件（可选）
└── other-files   # 其他支持文件
```

## 最佳实践

### 通用建议

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

3. **状态管理**：

   - 框架目前不提供通用的状态管理能力，插件可通过 `用户id` 和 `isPrivate` 自行实现

4. **资源管理**：
   - 在 `init()` 中初始化资源
   - 在 `cleanup()` 中释放资源
   - 使用异步方法处理耗时操作

### 图片生成建议

1. **性能优化**：

   ```javascript
   // 使用缓存提高图片生成性能
   const imageCache = new Map();

   async main(_, content) {
     if (imageCache.has(content)) {
       return {
         text: "缓存结果",
         image: imageCache.get(content)
       };
     }

     const newImage = await generateImage(content);
     imageCache.set(content, newImage);
     return { text: "新生成", image: newImage };
   }
   ```

2. **轻量化处理**：

   ```javascript
   // 直接使用远程 URL代替 Buffer
   async main() {
     const imageUrl = "https://example.com/pre-generated-image.png";
     return {
       text: "图片结果",
       image: imageUrl
     };
   }
   ```

3. **内容精简**：
   - 避免生成过大的图片（超过 1MB）
   - 压缩图片质量：`{ quality: 80 }`
   - 限制图片尺寸：`{ width: 800 }`

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
    async main(msgType, msgContent, senderOpenid, isPrivate) {
      return `你好，${senderOpenid}！你在${
        isPrivate ? "私聊" : "群聊"
      }中说了: ${msgContent}`;
    },
  },
};
```

### 4. 创建图片插件 (main.js)

```javascript
// image-plugin/main.js
module.exports = {
  imagePlugin: {
    async main() {
      // 生成动态图片
      const imgBuffer = await generateDynamicImage();

      return {
        text: "这是为您生成的图片：",
        image: imgBuffer,
      };
    },
  },
};
```

### 5. 使用插件

用户发送：

```
@bot hello 这是一条测试消息
```

机器人回复：

```
你好，user-openid！你在群聊中说了: 这是一条测试消息
```

用户发送：

```
@bot image 生成风景图
```

机器人回复：

```
这是为您生成的图片：[图片]
```
