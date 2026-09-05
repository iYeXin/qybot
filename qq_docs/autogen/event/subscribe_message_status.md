# 订阅消息授权状态变更

用户对订阅消息模板的授权状态发生变化时触发。 可用于判断用户是否允许/拒绝接收某个订阅消息模板。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | SUBSCRIBE_MESSAGE_STATUS |
| Intent | GROUP_AND_C2C_EVENT (1<<25) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| group_openid | string | 群 OpenID（群订阅场景时有值） |
| openid | string | 用户 OpenID（个人订阅场景时有值） |
| result | []SubscribeMsgTemplateResult | 各模板的授权结果列表 |

SubscribeMsgTemplateResult

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| template_id | integer | 平台提供的订阅模板 ID |
| custom_template_id | string | 自定义订阅模板 ID |
| op | integer | 用户操作。1=允许订阅, 2=拒绝订阅 |
| subscribe_id | string | 订阅 ID，发送订阅消息时需使用 |
| subscribe_ts | integer | 订阅操作时间戳（Unix 秒） |
| update_ts | integer | 订阅状态最后更新时间戳（Unix 秒） |

### 事件示例

订阅消息授权状态变更

```text
{
  "openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "result": [
    {
      "template_id": 10001,
      "custom_template_id": "tpl_abc123",
      "op": 1,
      "subscribe_id": "sub_def456",
      "subscribe_ts": 1784276820,
      "update_ts": 1784276820
    },
    {
      "template_id": 10002,
      "custom_template_id": "tpl_xyz789",
      "op": 2,
      "subscribe_id": "sub_ghi012",
      "subscribe_ts": 1784276815,
      "update_ts": 1784276820
    }
  ]
}
```
