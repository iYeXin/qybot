# 子频道更新

子频道信息变更时触发。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | CHANNEL_UPDATE |
| Intent | GUILDS (1<<0) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 子频道 ID |
| guild_id | string | 所属频道 ID |
| name | string | 子频道名称 |
| type | integer | 子频道类型。0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛 |
| sub_type | integer | 子频道子类型 |
| owner_id | string | 创建者 ID |
| op_user_id | string | 操作人 ID |

### 事件示例

示例1

```text
{
  "id": "123456",
  "guild_id": "123456789012345678",
  "name": "更新后的子频道",
  "type": 0,
  "sub_type": 0,
  "position": 1,
  "owner_id": "123456789012345678"
}
```
