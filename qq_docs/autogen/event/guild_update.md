# 频道更新

频道信息变更时触发。事件内容为变更后的数据。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | GUILD_UPDATE |
| Intent | GUILDS (1<<0) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 频道 ID |
| name | string | 频道名称 |
| icon | string | 频道头像 URL |
| owner_id | string | 频道创建者 ID |
| member_count | integer | 频道成员数 |
| max_members | integer | 频道成员上限 |
| description | string | 频道简介 |
| joined_at | string | 加入时间，ISO8601 格式 |
| op_user_id | string | 操作人 ID |

### 事件示例

示例1

```text
{
  "id": "123456789012345678",
  "name": "更新后的频道",
  "owner_id": "123456789012345678",
  "icon": "https://thirdqq.qlogo.cn/0",
  "member_count": 12,
  "max_members": 1000,
  "description": "更新后的描述"
}
```
