# 互动事件

用户与机器人的互动操作触发此事件，包括消息按钮点击、快捷菜单回调、消息反馈、清空会话、进出故事集、切换模型、用户/群授权等。 收到事件后需调用 PUT /interactions/{interaction_id} 接口回应，否则客户端会一直 loading 直到超时。

仅 type=11（消息按钮）和 type=12（快捷菜单）需要调用 PUT /interactions/{interaction_id} 回应；其他类型（消息反馈、清空会话、进出故事集、切换模型、授权等）无需回应。同一 interaction_id 只能回应一次，超时后失效。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | INTERACTION_CREATE |
| Intent | INTERACTION (1<<26) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 事件 ID，用于被动消息发送和互动回调 |
| type | integer | 互动类型 11 - 消息按钮回调（INLINE_KEYBOARD）：用户点击消息中的内联键盘按钮 12 - 单聊快捷菜单回调（CALLBACK_COMMAND）：用户点击单聊场景下的自定义菜单 13 - 消息反馈（MESSAGE_FEEDBACK）：用户对智能体消息进行点赞/点踩反馈 14 - 清空会话（CLEAR_SESSION）：用户清空智能体会话历史 15 - 进出故事集（IN_OUT_STORY）：用户进入或退出故事集 16 - 切换模型（SWITCH_MODEL）：用户切换智能体模型 18 - 用户授权（USER_AUTHORIZE）：用户授权事件 19 - 群授权（GROUP_AUTHORIZE）：群授权事件 20 - 群授权状态变更（GROUP_AUTHORIZE_STATUS） |
| scene | string | 事件发生场景。c2c=单聊, group=群聊, guild=频道 |
| chat_type | integer | 聊天场景。0=频道, 1=群聊, 2=单聊 |
| timestamp | string | 触发时间，RFC3339 格式 |
| guild_id | string | 频道 OpenID（仅频道场景有值） |
| channel_id | string | 子频道 OpenID（仅频道场景有值） |
| user_openid | string | 用户 OpenID（仅单聊场景有值） |
| group_openid | string | 群 OpenID（仅群聊场景有值） |
| group_member_openid | string | 群成员 OpenID（仅群聊场景有值） |
| data | InteractionData | 互动数据 |
| version | integer | 版本号，默认 1 |
| application_id | string | 机器人 AppID |

InteractionData

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| type | integer | 互动数据类型，与外层 type 含义一致。11=消息按钮点击, 12=快捷菜单点击, 13=消息反馈点击, 14=清空会话点击, 15=故事集点击, 16=切换模型点击 |
| resolved | InteractionResolved | 解析后的互动数据 |

InteractionResolved

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| button_data | string | 按钮的 data 字段值（发送消息按钮时设置）；消息反馈场景下为回调数据 |
| button_id | string | 按钮的 id 字段值（发送消息按钮时设置） |
| user_id | string | 操作用户 ID（仅频道场景有值） |
| feature_id | string | 功能 ID（仅快捷菜单有值，管理端设置） |
| message_id | string | 操作的消息 ID（频道场景为消息 OpenID；消息反馈场景为机器人消息 ID） |
| feedback_opt | string | 反馈选项（仅 type=13 消息反馈）。LIKE=点赞, UNLIKE=点踩 |
| checked | integer | 反馈选项是否选中（仅 type=13 消息反馈） |
| action | string | 操作类型（type=15 故事集：ENTER_STORY=进入, QUIT_STORY=退出；type=16 切换模型：对应操作动作） |
| message_scene | InteractionMessageScene | 消息场景信息（仅 type=13 消息反馈） |
| authorize_data | AuthorizeData | 授权数据（仅 type=18/19 用户/群授权事件） |

InteractionMessageScene

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| ext | []string | 扩展信息键值对列表，如 "disable_net_search=1" 表示关闭联网搜索 |

AuthorizeData

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| opt_scene | string | 授权操作场景。setting=资料页设置, dialog=弹窗授权 |
| scope | string | 授权范围。c2c_push=C2C 主动消息推送, group_push=群主动消息推送 |

### 事件示例

示例1

```text
{
  "application_id": "1904842048",
  "chat_type": 2,
  "data": {
    "resolved": {
      "button_data": "confirm:once",
      "button_id": "allow-once"
    },
    "type": 11
  },
  "id": "1b13d569-4610-4ab9-bc51-feecc5def6d4",
  "scene": "c2c",
  "timestamp": "2026-07-20T21:53:54+08:00",
  "type": 11,
  "user_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "version": 1
}
```

示例2

```text
{
  "application_id": "101984245",
  "chat_type": 1,
  "data": {
    "resolved": {
      "button_data": "eyJjb21tYW5kIjogInNhbXBsZSJ9"
    },
    "type": 11
  },
  "group_member_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "id": "06915133-7aef-46ed-94f7-c50939e285ae",
  "scene": "group",
  "timestamp": "2026-07-20T21:53:54+08:00",
  "type": 11,
  "version": 1
}
```

示例3

```text
{
  "application_id": "102057050",
  "data": {
    "resolved": {
      "authorize_data": {
        "opt_scene": "setting",
        "scope": "c2c_push"
      }
    }
  },
  "id": "c30c003e-9454-4450-8e5e-665267c088c4",
  "scene": "c2c",
  "timestamp": "2026-07-20T21:54:38+08:00",
  "type": 18,
  "user_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "version": 1
}
```
