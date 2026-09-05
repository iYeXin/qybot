# 查询群禁言状态

查询群禁言状态，包含全员禁言模式与成员级禁言列表。

机器人需拥有群管理员身份。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/restrict_chat_setting |
| HTTP Method | GET |
| 接口频率限制 | 30 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群OpenID |

### 请求示例

查询群内有禁言状态

```text
GET /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/restrict_chat_setting

{}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| global_rule | GlobalMuteRule | 群级禁言规则（全员禁言配置） |
| members | []MemberMuteState | 当前处于禁言中的用户列表（不含已过期） |

GlobalMuteRule

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| mode | string | 全员禁言模式：none 未开启，always 始终禁言，schedule 定时禁言(定时和周期性) |
| schedule_rules | []MuteScheduleRule | 定时禁言规则列表（可包含多条） |
| recurring_rules | []MuteRecurringRule | 周期禁言规则列表（可包含多条） |

MuteScheduleRule

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| task_id | string | 任务ID，用于标记此定时禁言任务 |
| start_at | string | 禁言开始时间（RFC3339 格式） |
| end_at | string | 禁言结束时间（RFC3339 格式） |
| enabled | boolean | 此规则是否启用 |

MuteRecurringRule

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| task_id | string | 任务ID，用于标记此周期禁言规则 |
| weekdays | []integer | 生效星期几列表，取值 1~7（1=周一，7=周日），可多选 |
| start_time | string | 时段开始时间，格式 HH:mm（北京时间） |
| end_time | string | 时段结束时间，格式 HH:mm（北京时间）；若小于 start_time 表示跨天到次日 |
| enabled | boolean | 此规则是否启用 |

MemberMuteState

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| member_openid | string | 被禁言成员的 openid |
| mute_expire_at | string | 禁言到期时间（RFC3339 格式） |
| username | string | 被禁言成员的昵称 |
| union_openid | string | 用户在应用/开放平台下的统一标识（如有） |

## 响应示例

```json
{
  "global_rule": {
    "mode": "schedule",
    "schedule_rules": [
      {
        "task_id": "task_7ffd5d31e2b37c1c872acb51",
        "start_at": "2026-07-22T10:44:00+08:00",
        "end_at": "2026-07-22T11:44:00+08:00",
        "enabled": false
      },
      {
        "task_id": "task_e9ca43ca9a31b539d824639c",
        "start_at": "2026-07-22T10:54:00+08:00",
        "end_at": "2026-07-22T11:54:00+08:00",
        "enabled": false
      }
    ],
    "recurring_rules": [
      {
        "task_id": "task_3a6348b8fb04bbc48b8a8709",
        "weekdays": [
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "start_time": "13:05",
        "end_time": "14:05",
        "enabled": true
      }
    ]
  },
  "members": [
    {
      "member_openid": "EC58D87F598C8294A533B9D458DAAF33",
      "mute_expire_at": "2026-08-05T11:23:04+08:00",
      "username": "T小不点101",
      "union_openid": "EC58D87F598C8294A533B9D458DAAF33"
    }
  ]
}
```
