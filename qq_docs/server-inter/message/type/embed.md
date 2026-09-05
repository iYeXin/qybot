# Embed 消息

|  | 单聊 | 群聊 | 文字子频道 | 频道私信 |
| --- | --- | --- | --- | --- |
| 机器人接收 | - | - | - | - |
| 机器人发送 | 不支持 | 不支持 | 支持 | 支持 |

## 样式

## 数据结构与协议

### Content-Type

```http
application/json
```

### 参数

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| embed | MessageEmbed | embed 消息详情 |

- 其中 embed.thumbnail 为选填，没有缩略图的可以不填。
- embed.fields.name 为文本。

### 返回

返回Message对象。

### 错误码

详见错误码。

### 示例

请求数据包

```json
{
  "embed": {
    "title": "标题",
    "prompt": "消息通知",
    "thumbnail": {
      "url": "xxxxxx"
    },
    "fields": [
      {
        "name": "当前等级：黄金"
      },
      {
        "name": "之前等级：白银"
      },
      {
        "name": "😁继续努力"
      }
    ]
  }
}
```

返回包

```json
{
  "id": "xxxxxx",
  "channel_id": "xxxxxx",
  "guild_id": "xxxxxx",
  "timestamp": "2021-12-07T15:24:54+08:00",
  "tts": false,
  "mention_everyone": false,
  "author": {
    "id": "xxxxxx",
    "username": "abc",
    "avatar": "",
    "bot": true
  },
  "embeds": [
    {
      "title": "标题",
      "prompt": "xxxx",
      "description": "",
      "thumbnail": {
        "url": "xxxxxx"
      },
      "fields": [
        {
          "name": "当前等级：黄金"
        },
        {
          "name": "之前等级：白银"
        },
        {
          "name": "😁继续努力"
        }
      ]
    }
  ],
  "pinned": false,
  "type": 0,
  "flags": 0
}
```
