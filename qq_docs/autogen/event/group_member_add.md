# 群成员加入

有新成员加入群聊时触发。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | GROUP_MEMBER_ADD |
| Intent | GROUP_MEMBER_EVENT (1<<24) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| timestamp | integer | 事件时间戳（Unix 秒） |
| group_openid | string | 群 OpenID |
| member_openid | string | 新加入成员的 OpenID |
| user_openid | string | 新成员的用户 OpenID（跨应用统一标识，可能为空） |

### 事件示例

示例1

```text
{
  "timestamp": 1784276757,
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "member_openid": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6",
  "user_openid": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6"
}
```
