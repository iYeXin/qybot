# QYbot - 轻量级 QQ 机器人框架

QYbot 是一个接入 QQ 官方机器人，轻量级、模块化的群聊 QQbot 框架，采用插件化设计，支持快速扩展功能。通过简洁的 API 和灵活的架构，开发者可以轻松创建功能丰富的 QQ 机器人。

## 1.1.0 新增

- 插件部署支持插件包热重载
- 提供官方插件市场服务
- 增添了图片回复的能力
- 完善了多篇文档

## 核心特性

- **插件化架构** - 通过插件扩展机器人功能
- **极简开发** - 快速上手，低学习曲线
- **模块化设计** - 独立插件，互不干扰

## 插件市场

你可以在[QYbot 插件市场](https://market.qybot.yexin.wiki/)寻找或上传插件

## 快速开始

### 前置准备

1. 在[QQ 开放平台](https://q.qq.com/)注册账号并创建机器人
2. 获取机器人的 `AppId` 和 `AppSecret`
3. 将服务器 IP 添加到 QQ 平台的白名单

### 安装部署

```bash
# 克隆项目
git clone https://github.com/iYeXin/qybot
cd qybot

# 配置机器人
# 编辑 app.js 文件，填入你的AppId和AppSecret
```

### app.js 配置示例

```javascript
module.exports = {
  botConfig: {
    appId: "xxxxxxx", // 替换为你的AppId
    secret: "xxxxxxx", // 替换为你的AppSecret
    imageServer: "https://market.qybot.yexin.wiki/upload-image/", // 图片上传接口，公共接口不保证稳定性
    sandBox: true, // 测试环境设为true，上线后设为false
  },
};
```

[imageServer 规范](./imageServer.md)

### 安装插件

你可以在[QYbot 插件市场](https://market.qybot.yexin.wiki/)寻找或上传插件
插件系统支持热重载，你可以在运行时直接将插件包放入插件目录，插件将自动加载

1. 将插件包放置在 `/plugins` 目录下
2. 根据插件要求进行配置（通常插件会提供配置说明）
3. 对于适配的插件，你可以在[QQ 机器人控制台](https://q.qq.com/qqbot/#/developer/publish-config/function-config)中添加同名的指令
4. 插件目录结构示例：
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
[DeepSeek] 插件初始化完成
[PLUGIN] deepseekPlugin 初始化完成
[PLUGIN] 插件加载完成，共加载 1 个插件
...
发送首次心跳
```

## 插件开发

QYbot 采用插件化架构，所有功能通过插件实现。插件开发文档请参考：

[插件系统 API 文档](./pluginsAPI.md)

### 创建简单插件

1. 在 `/plugins` 目录下创建插件文件夹：

   ```bash
   mkdir plugins/hello-plugin
   ```

2. 创建 `manifest.json`：

   ```json
   {
     "name": "helloPlugin",
     "version": 1.0,
     "mainExport": "./main",
     "processingTypes": ["hello", "hi"]
   }
   ```

3. 创建 `main.js`：

   ```javascript
   module.exports = {
     helloPlugin: {
       async main(msgType, msgContent, senderOpenid) {
         return `你好，${senderOpenid}！你说的是: ${msgContent}`;
       },
     },
   };
   ```

4. 重启机器人后即可使用：
   ```
   @bot hello 这是一条测试消息
   ```

## 常见问题

### 1. 机器人无法连接

- 确认 `appId` 和 `secret` 配置正确
- 检查服务器 IP 是否添加到 QQ 平台白名单
- 确认网络连接正常，无防火墙阻止

### 2. 插件未加载

- 检查插件目录结构是否符合规范
- 确认 `manifest.json` 文件配置正确
- 查看日志中的插件加载信息

### 3. 消息未响应

- 确认消息格式正确：`@bot <消息类型> <消息内容>`
- 检查插件是否注册了对应的消息类型
- 查看插件日志是否有错误输出

## 贡献指南

欢迎贡献代码

## 许可证

本项目采用 [MIT 许可证](LICENSE)

## 技术支持

如有任何问题，请提交 [Issues](https://github.com/iYeXin/qybot/issues)
