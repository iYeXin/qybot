# 单聊消息接收开启

用户在机器人资料卡手动开启"主动消息"推送开关时触发。

用户在机器人资料卡手动开启主动消息推送开关时触发。开启后机器人可向该用户发送主动消息。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | C2C_MSG_RECEIVE |
| Intent | GROUP_AND_C2C_EVENT (1<<25) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| timestamp | integer | 操作时间戳（Unix 秒） |
| openid | string | 用户 OpenID |

### 事件示例

C2C消息接收开启

```text
{
  "openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "timestamp": 1784570617
}
```
