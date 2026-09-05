# 修改入群自动审批策略的白名单号码

对指定策略批量新增或删除白名单 QQ 号码，单次最多 10000 个，号码上限 10W。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy/{strategy_id}/whitelist_users |
| HTTP Method | POST |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| strategy_id | string | 是 | 策略 ID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| op | string | 是 | 操作类型：add 新增号码，del 删除号码 |
| whitelist_users | []string | 是 | QQ 号码列表，单次最多 10000 个；使用字符串类型避免 JS 精度问题 |

### 请求示例

添加白名单

```text
POST /v2/groups/join_approval_strategy/st_d83eca11e9/whitelist_users

{"op":"add","whitelist_users":["1234567","1234568"]}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| strategy_id | string | 策略 ID |
| whitelist_user_count | integer | 操作后策略当前白名单号码数（估算） |
| updated_at | string | 策略更新时间（RFC3339 格式） |

## 响应示例

```json
{
  "strategy_id": "st_d83eca11e9",
  "whitelist_user_count": 2,
  "updated_at": "2026-08-05T15:45:28+08:00"
}
```
