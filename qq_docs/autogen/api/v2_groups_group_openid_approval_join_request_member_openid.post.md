# 入群申请审批

审批入群申请：approve 通过，decline 拒绝。

机器人需拥有群管理员身份。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/approval_join_request/{member_openid} |
| HTTP Method | POST |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群OpenID |
| member_openid | string | 是 | 成员OpenID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| op | string | 是 | 审批动作：approve 通过，decline 拒绝 |
| join_request_id | string | 否 | 申请ID |
| reject_reason | string | 否 | 拒绝理由，op=decline 时可填 |
| add_to_member_blacklist | boolean | 否 | 是否同时加入群黑名单，默认 false, action=decline 时可填 |

### 请求示例

通过用户审批

```text
POST /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/approval_join_request/FE003FAF76C4817251FDC128A16753BB
{
  "op": "approve",
  "join_request_id": "AURi8Rr6MfGdUNedupWf2uV5XiayURHaetzwGyOdrj6mHYOsfJFkbe9u8UjCMpLTxUouwr1SJ9IGEbxlbzDi43hPS4rw64G4i2Y4nL4DTH50U15xKPZYRsXPB7WUxZOUdceNSAv_GJtO4ffSrVZIhQxknoPD2SDT"
}
```

拒绝并拉黑

```text
POST /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/approval_join_request/FE003FAF76C4817251FDC128A16753BB
{
  "op": "decline",
  "join_request_id": "AVKiFWpdy0-q0rfCkpQFbWB9GvX7QPIe9hlsbVeO6TiurrZw1DHP0sXGnbUR4Xm79tKNpfl4zZynxeibVwwUD6h96RqiFB-4V6p5FKGXfqInOuQQSf5WwXr8lyIsn6yeaMwEI1KSuTTMBMNe6WN8bDtKg2REXTcF",
  "reject_reason": "示例拒绝：机器人自动拒绝",
  "add_to_member_blacklist": true
}
```

## 响应

无

## 响应示例

```json
{}
```
