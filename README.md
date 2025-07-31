# QYbot - 轻量级 QQ 机器人框架

QYbot 是一个接入 QQ 官方机器人，轻量级、模块化的群聊 QQbot 框架，采用插件化设计，支持快速扩展功能。通过简洁的 API 和灵活的架构，开发者可以轻松创建功能丰富的 QQ 机器人。

## 1.1 版本新增

- **图片生成支持** - 新增 Markdown/HTML 转图片功能，支持图文混合回复
- **插件上下文增强** - 提供图片生成工具链（md2html/html2img/md2img）
- **Chrome 集成** - 支持本地 Chrome 渲染高质量图片
- **插件热重载** - 支持插件包运行时自动加载
- **官方插件市场** - 提供插件共享平台
- **文档完善** - 新增图片生成 API 说明和开发示例

## 核心特性

- **插件化架构** - 通过插件扩展机器人功能
- **图文混合回复** - 支持文本+图片组合消息
- **极简开发** - 快速上手，低学习曲线
- **模块化设计** - 独立插件，互不干扰

## 插件市场

你可以在[QYbot 插件市场](https://market.qybot.yexin.wiki/)寻找或上传插件

## 快速开始

### 前置准备

1. 在[QQ 开放平台](https://q.qq.com/)注册账号并创建机器人
2. 获取机器人的 `AppId` 和 `AppSecret`
3. 将服务器 IP 添加到 QQ 平台的白名单
4. **确保有 Chrome 浏览器**（本地图片生成功能必需）

### 安装部署

```bash
# 克隆项目
git clone https://github.com/iYeXin/qybot
# 或下载源码解压
cd qybot
# 安装依赖
npm i
# 配置机器人
# 编辑 app.js 文件，填入你的AppId和AppSecret
```

### app.js 配置示例

```javascript
module.exports = {
  botConfig: {
    appId: "xxxxxxx", // 替换为你的AppId
    secret: "xxxxxxx", // 替换为你的AppSecret
    imageServer: "https://market.qybot.yexin.wiki/upload-image/", // 图片上传接口
    sandBox: true, // 测试环境设为true，上线后设为false
  },
};
```

[imageServer 规范](./imageServer.md)

### 安装插件

1. 将插件 ZIP 包直接放入 `/plugins` 目录
2. 系统会自动解压并加载插件
3. 插件目录结构示例：
   ```
   /plugins/
     └── my-plugin/
           ├── manifest.json
           ├── main.js
           └── config.js
   ```

### 启动机器人

```bash
npm start
```

成功启动后，控制台将显示类似以下信息：

```
[PLUGIN] 插件加载完成，共加载 3 个插件
...
发送首次心跳
```

## 图片生成功能

### 使用场景

- 将 Markdown 技术文档转为图片分享
- 生成数据可视化图表
- 创建带格式的公告图片
- 转换代码片段为高亮图片

### 核心 API

```javascript
// 在插件中通过上下文访问
this.ctx.utils = {
  md2html, // Markdown → HTML
  html2img, // HTML → 图片Buffer
  md2img, // Markdown → 图片Buffer
};
```

### 开发示例

```javascript
module.exports = {
  chartPlugin: {
    async main(_, content) {
      // 生成图表SVG
      const chartSVG = generateChart(content);

      // 转换SVG为图片
      const imgBuffer = await this.ctx.utils.html2img(
        `<div style="background:white;padding:20px">${chartSVG}</div>`,
        { width: 800 }
      );

      return {
        text: "这是您的图表：",
        image: imgBuffer,
      };
    },
  },
};
```

## 插件开发

### 创建支持图片的插件

```javascript
// markdown-plugin/main.js
module.exports = {
  markdownPlugin: {
    async main(_, markdownContent) {
      try {
        // 使用上下文工具转换Markdown
        const imgBuffer = await this.ctx.utils.md2img(markdownContent, {
          width: 450,
        });

        return {
          text: "Markdown转换结果：",
          image: imgBuffer,
        };
      } catch (error) {
        return "转换失败：" + error.message;
      }
    },
  },
};
```

### 使用示例

用户发送：

```
@bot markdown
# 标题
- 列表项1
- 列表项2
```

机器人回复：
![生成的Markdown图片](#)

## 开发潜力

### 你可以

- **AI 集成** - 接入人工智能生成图文内容 （参见 deepdeek 插件）
- **数据可视化** - 动态生成数据图表
- **教育工具** - 数理化公式转图片
- **内容摘要** - 网页内容转图文摘要
- **游戏系统** - 生成游戏状态图片

### 性能优化

```javascript
// 使用缓存提高性能
const cachedImages = new Map();

async main(_, content) {
  if (cachedImages.has(content)) {
    return {
      text: "缓存结果",
      image: cachedImages.get(content)
    };
  }

  const newImage = await generateImage(content);
  cachedImages.set(content, newImage);
  return { text: "新生成", image: newImage };
}
```

## 常见问题

### 图片生成失败

- 确认已安装 Chrome 浏览器
- 检查环境变量 `CHROME_PATH` 是否指向正确位置
- 增加超时时间：`html2img(html, { timeout: 60000 })`

### 插件开发建议

1. **错误处理** - 捕获异常并提供有效指引
2. **缓存机制** - 对相同内容使用缓存
3. **内容精简** - 避免生成过大的图片

## 技术支持

如有任何问题，请提交 [Issues](https://github.com/iYeXin/qybot/issues)
