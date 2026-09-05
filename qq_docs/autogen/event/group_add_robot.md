# 机器人加入群聊

机器人被添加到群聊时触发。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | GROUP_ADD_ROBOT |
| Intent | GROUP_AND_C2C_EVENT (1<<25) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| timestamp | integer | 加入时间戳（Unix 秒） |
| group_openid | string | 群 OpenID |
| op_member_openid | string | 操作添加机器人进群的群成员 OpenID |

### 事件示例

机器人加入群聊

```text
{
  "group_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "op_member_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "timestamp": 1784570534
}
```
