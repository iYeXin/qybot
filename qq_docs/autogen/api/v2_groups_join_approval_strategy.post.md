# 创建入群自动审批策略

创建入群自动审批策略，指定关联群号。strategy_id 由服务端生成。一个机器人最多 20 个策略。

设置的规则只有当机器人需拥有群管理员身份时，才会生效会运行。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy |
| HTTP Method | POST |
| 接口频率限制 | 60 QPM |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openids | []string | 否 | group_openids 与 group_ids 二选一必填，同时传入或均未传入均返回错误 关联的群 openid 列表，最多 100 个；与 group_ids 互斥 |
| group_ids | array | 否 | 关联的 QQ 群号列表（uint64），最多 100 个；与 group_openids 互斥 |
| is_enable | string | 否 | 是否启用策略，on-启用 off-关闭，默认 on |
| expire_at | string | 否 | 过期时间（RFC3339 格式）；不传默认一年过期 |
| remark | string | 否 | 策略备注，最多 255 个汉字，不必填 |

### 请求示例

```text
POST /v2/groups/join_approval_strategy

{"group_openids":["\u003cxxxxxxxx1","xxxxx2\u003e"],"is_enable":"on","expire_at":""}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| strategy_id | string | 服务端生成的策略 ID |
| is_enable | string | 是否启用，on-启用 off-关闭 |
| expire_at | string | 过期时间（RFC3339 格式） |

## 响应示例

```json
{
  "strategy_id": "st_d83eca11e9",
  "is_enable": "on",
  "expire_at": "2027-08-05T15:30:16+08:00"
}
```
