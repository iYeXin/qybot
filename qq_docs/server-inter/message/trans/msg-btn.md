# 消息按钮

说明

在 markdown 消息的基础上，支持消息最底部挂载按钮。

## 发送方式

【申请使用】按钮模版，按钮模版暂时不支持使用变量填充。

```json
{
    "keyboard": {
        "id": "123" // 申请模版后获得
    }
}
```

【内邀开通】自定义按钮

```json
{
    "keyboard": {
        "content": {
            "rows": [
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
            ] // 自定义按钮内容，最多可以发送5行按钮，每一行最多5个按钮。
        }
    }
}
```

## 数据结构与协议

消息发送接口 keyboard 字段值是一个 Json Object {}，rows 数组的每个元素表示每一行按钮

每个 button 是一个 Json Object，具体字段如下：

| 属性 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 按钮ID：在一个keyboard消息内设置唯一 |
| render_data.label | string | 是 | 按钮上的文字 |
| render_data.visited_label | string | 是 | 点击后按钮的上文字 |
| render_data.style | int | 是 | 按钮样式：0 灰色线框，1 蓝色线框 |
| action.type | int | 是 | 设置 0 跳转按钮：http 或 小程序 客户端识别 scheme，设置 1 回调按钮：回调后台接口, data 传给后台，设置 2 指令按钮：自动在输入框插入 @bot data |
| action.permission.type | int | 是 | 0 指定用户可操作，1 仅管理者可操作，2 所有人可操作，3 指定身份组可操作（仅频道可用） |
| action.permission.specify_user_ids | array | 否 | 有权限的用户 id 的列表 |
| action.permission.specify_role_ids | array | 否 | 有权限的身份组 id 的列表（仅频道可用） |
| action.data | string | 是 | 操作相关的数据 |
| action.reply | bool | 否 | 指令按钮可用，指令是否带引用回复本消息，默认 false。支持版本 8983 |
| action.enter | bool | 否 | 指令按钮可用，点击按钮后直接自动发送 data，默认 false。支持版本 8983 |
| action.anchor | int | 否 | 本字段仅在指令按钮下有效，设置后后会忽略 action.enter 配置。
设置为 1 时 ，点击按钮自动唤起启手Q选图器，其他值暂无效果。
（仅支持手机端版本 8983+ 的单聊场景，桌面端不支持） |
| action.click_limit | int | 否 | 【已弃用】可操作点击的次数，默认不限 |
| action.at_bot_show_channel_list | bool | 否 | 【已弃用】指令按钮可用，弹出子频道选择器，默认 false |
| action.unsupport_tips | string | 是 | 客户端不支持本action的时候，弹出的toast文案 |

示例

```json
{
  "rows": [
    {
      "buttons": [
        {
          "id": "1",
          "render_data": {
            "label": "⬅️上一页",
            "visited_label": "⬅️上一页"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        },
        {
          "id": "2",
          "render_data": {
            "label": "➡️下一页",
            "visited_label": "➡️下一页"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        }
      ]
    },
    {
      "buttons": [
        {
          "id": "3",
          "render_data": {
            "label": "📅 打卡（5）",
            "visited_label": "📅 打卡（5）"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        }
      ]
    }
  ]
}
```

## 相关事件与接口

用户点击回调按钮会触发 `INTERACTION_CREATE` 事件，机器人收到事件后需调用 `PUT /interactions/{interaction_id}` 进行回应，否则客户端会一直处于 loading 状态直到超时。

- 事件详情：INTERACTION_CREATE
- 回应接口：PUT /interactions/{interaction_id}
