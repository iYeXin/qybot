# QYbot DeepSeek AI 插件

基于 DeepSeek API 实现的 QQ 机器人智能对话插件，支持与 DeepSeek 大模型进行智能对话，并可将 Markdown 格式的回答转换为图片发送。

## 功能特性

- 支持与 DeepSeek 大模型进行智能对话
- 支持多种模型：`deepseek-chat` 和 `deepseek-reasoner`
- 支持余额查询功能
- 支持将 Markdown 格式回答转换为图片发送
- 支持宽屏图片生成（-w 后缀）
- 智能错误处理和降级机制

## 使用说明

### 1. 对话指令

```
@bot chat <对话内容>
@bot chatr1 <对话内容>
@bot /chat <对话内容>
@bot /chatr1 <对话内容>
```

示例：

```
用户：@bot chat 你好，介绍一下你自己
机器人：[Markdown格式的回答，或转换后的图片]
```

### 2. 宽屏图片生成

在指令后添加 `-w` 后缀可生成宽屏图片（1080px宽度）：

```
@bot chat-w <对话内容>
@bot chatr1-w <对话内容>
@bot /chat-w <对话内容>
@bot /chatr1-w <对话内容>
```

### 3. 余额查询

```
@bot deepseek
@bot /deepseek
```

示例：

```
用户：@bot deepseek
机器人：服务可用：
剩余余额：￥99.9
```

## 配置要求

在 config.json 中填写您的 DeepSeek API Key：

```json
{
    "API_KEY": "替换为你在(https://platform.deepseek.com/api_keys)创建的apikey"
}
```

## 注意事项

1. 需要有效的 DeepSeek API Key 才能使用此插件
2. 图片生成功能需要系统安装 Chrome 浏览器
3. 图片转换有超时限制（8秒），超时将自动降级为文本回复
4. 若未提供图片生成上下文，将直接返回 Markdown 文本

## 使用示例

1. 普通对话：

```
用户：@bot chat 什么是人工智能？
机器人：[AI的回答，以图片或文本形式]
```

2. 宽屏图片生成：

```
用户：@bot chat-w 请用表格对比人工智能的几种主要学习方式
机器人：[宽屏格式的表格图片]
```

3. 余额查询：

```
用户：@bot deepseek
机器人：服务可用：
剩余余额：￥99.9
```

4. 错误处理：

```
用户：@bot chat 无效指令
机器人：DeepSeek 服务暂时不可用
```

## 安装说明

1. 将插件文件夹放入 QYbot 的`/plugins`目录
2. 在`config.json`中填写 DeepSeek 的 API Key
3. 重启机器人或等待插件热重载
4. 在 QQ 机器人控制台添加指令：chat、chatr1、deepseek 及其变体

## 技术说明

### 支持的模型

- `deepseek-chat`：通用对话模型
- `deepseek-reasoner`：推理模型

### 图片生成功能

插件支持将 Markdown 格式的回答转换为图片发送：

1. 自动检测上下文中的图片生成工具
2. 支持宽屏模式（1080px宽度）
3. 8秒超时保护
4. 降级机制：图片生成失败时返回原始 Markdown 文本

### API 接口

插件通过 DeepSeek 官方 API 实现功能：

- 对话接口：`https://api.deepseek.com/chat/completions`
- 余额查询接口：`https://api.deepseek.com/user/balance`

## 错误处理

插件实现了全面的错误处理机制：

1. API 调用失败时返回友好提示
2. 网络异常时自动重试
3. 图片转换超时时自动降级为文本回复
4. 上下文缺失时直接返回 Markdown 文本
        