# 修改入群自动审批策略

修改策略的生效状态、失效时间或增删关联群。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy/{strategy_id} |
| HTTP Method | PATCH |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| strategy_id | string | 是 | 策略 ID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| is_enable | string | 否 | 是否启用策略，on-启用 off-关闭 |
| expire_at | string | 否 | 过期时间（RFC3339 格式） |
| group_action | GroupAction | 否 | 关联群增删操作；群标识形式须与创建时一致 |
| remark | string | 否 | 策略备注，最多 255 个汉字，不必填 |

GroupAction

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| op | string | 是 | 操作类型：add 新增关联群，del 删除关联群 |
| group_openids | []string | 否 | 待操作的群 openid 列表；与 group_ids 互斥 |
| group_ids | array | 否 | 待操作的 QQ 群号列表（uint64）；与 group_openids 互斥 |

### 请求示例

停用规则

```text
PATCH /v2/groups/join_approval_strategy/st_d83eca11e9

 {"is_enable":"off"}
```

增加群OpenID

```text
 {"group_action":{"op":"add","group_openids":["aBCsdfasd"]}}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| is_enable | string | 是否启用，on-启用 off-关闭 |
| expire_at | string | 过期时间（RFC3339 格式） |

## 响应示例

停用规则

```json
{
  "is_enable": "off",
  "expire_at": "2027-08-05T15:30:16+08:00"
}
```
