# 消息交互概述

说明

在各种消息场景内，开发者可在消息体上实现自定义一些与用户的交互方式。

| 消息按钮 | 文字链 |
| --- | --- |
| 消息按钮 | 文字链 |

## 消息按钮互动流程

消息按钮互动的整体流程如下：

1. 发送带按钮的消息：机器人下发包含 keyboard 字段的消息，用户端看到消息底部挂载的按钮
2. 用户点击按钮：平台推送 `INTERACTION_CREATE` 事件给机器人
3. 机器人响应互动：机器人调用 PUT /interactions/{interaction_id} 回复用户

### 发送消息时携带 keyboard

在消息的 `keyboard` 字段中传入按钮配置，支持模板按钮和自定义按钮两种模式。

- 发送单聊消息：keyboard 字段参考
- 发送群聊消息：keyboard 字段参考

按钮数据示例（一处配置缓存一批按钮，动态提取生成行为按钮）：

```json
{
  "keyboard": {
    "id": "keyboard_id_xxx",
    "content": {
      "rows": [
        {
          "buttons": [
            {
              "id": "button_1",
              "render_data": {
                "label": "确认",
                "visited_label": "已确认",
                "style": 1
              },
              "action": {
                "type": 2,
                "permission": {
                  "type": 2,
                  "specify_role_ids": [],
                  "specify_user_ids": []
                },
                "click_limit": 1,
                "data": "/action_confirm",
                "at_bot_show_channel_list": false,
                "reply": true,
                "enter": true
              }
            }
          ]
        }
      ]
    }
  }
}
```

### 响应互动

收到 `INTERACTION_CREATE` 事件后，需要在规定时间内调用 PUT /interactions/{interaction_id} 响应，否则会超时。

响应超时时间：指令回调类场景为 3 秒。建议收到事件后尽快响应，避免因超时导致用户侧无反馈。
