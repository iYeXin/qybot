# 查询入群自动审批策略列表

查询当前生效中的策略列表，按创建时间倒序，支持分页。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy |
| HTTP Method | GET |
| 接口频率限制 | 60 QPM |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| cursor | string | 否 | 分页游标，首次请求可不传或传空串 |
| limit | integer | 否 | 单页数量，默认 20，最大 50 |

### 请求示例

```text
GET /v2/groups/join_approval_strategy

{}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| strategies | []JoinApprovalStrategy | 生效中的策略列表 |
| next_cursor | string | 下一页游标，空串表示已到末页 |

JoinApprovalStrategy

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| strategy_id | string | 策略 ID |
| group_openids | []string | 关联的群 openid 列表（创建时使用 group_openids 时返回） |
| group_ids | array | 关联的 QQ 群号列表（创建时使用 group_ids 时返回） |
| whitelist_user_count | integer | 白名单中的号码数量（估算，可能存在少量误差） |
| is_enable | string | 策略是否启用，on-启用 off-关闭 |
| expire_at | string | 过期时间（RFC3339 格式） |
| created_at | string | 创建时间（RFC3339 格式） |
| updated_at | string | 最近更新时间（RFC3339 格式） |
| remark | string | 策略备注 |

## 响应示例

```json
{
  "strategies": [
    {
      "strategy_id": "st_d83eca11e9",
      "group_openids": [],
      "group_ids": [],
      "whitelist_user_count": 2,
      "is_enable": "on",
      "expire_at": "2027-08-05T15:30:16+08:00",
      "created_at": "2026-08-05T15:30:16+08:00",
      "updated_at": "2026-08-05T15:45:28+08:00"
    },
    {
      "strategy_id": "st_7c0b77d442",
      "group_openids": [],
      "group_ids": [
        "10****499"
      ],
      "whitelist_user_count": 0,
      "is_enable": "on",
      "expire_at": "2027-08-04T11:20:40+08:00",
      "created_at": "2026-08-04T11:20:40+08:00",
      "updated_at": "2026-08-04T11:20:40+08:00"
    },
    {
      "strategy_id": "st_42cc272536",
      "group_openids": [],
      "group_ids": [
        "26****763",
        "26****978"
      ],
      "whitelist_user_count": 3,
      "is_enable": "on",
      "expire_at": "2027-07-31T11:40:21+08:00",
      "created_at": "2026-07-31T11:40:21+08:00",
      "updated_at": "2026-08-05T14:28:37+08:00"
    }
  ],
  "next_cursor": ""
}
```
