# 用户申请加群事件

用户申请加群请求触发此事件

1.只有当机器人是群管理员时才可以收到此事件。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | GROUP_JOIN_REQUEST |
| Intent | GROUP_MEMBER_EVENT (1<<24) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| group_openid | string | 群OpenID |
| join_request_id | string | 申请ID,需要在申请接口回传 |
| risk_tips | string | 安全提示语；可疑消息直接返回 warning_tips；普通消息命中 sec_risk_rules 时返回 top_tips |
| union_openid | string | 用户在应用/开放平台下的统一标识（如有） |
| member_openid | string | 申请人 openid |
| username | string | 申请人昵称 |
| apply_at | string | 申请时间戳（RFC3339 格式） |
| apply_source | string | 申请来源：self_apply 主动申请，invited 被邀请 |
| invited_by | string | 邀请人 openid（apply_source=invited 时有效） |
| bot | boolean | 是否为机器人账号 |
| verify_info | VerifyInfo | 用户入群验证方式 |
| auto_approved | AutoAppproved | 自动审批通过的扩展信息, 只有在下行事件中会携带。 |

VerifyInfo

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| method | string | 入群验证方式：verify_message / admin_review_qa |
| verify_message | string | 验证消息内容；仅 auth_type=verify_message 时可能携带 |
| review_qa_list | []ReviewQA | 问答列表；仅 auth_type=admin_review_qa 时可能携带 |

ReviewQA

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| question | string | 管理员设置的问题 |
| answer | string | 申请人填写的答案 |

AutoAppproved

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| strategy_id | string | 自动审批通过的策略ID |

### 事件示例

用户申请入群申请

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AVKiFWpdy0-q0rfCkpQFbWB9GvX7QPIe9hlsbVeO6TiurrZw1DHP0sXGnbUR4Xm79tKNpfl4zZynxeibVwwUD6h96RqiFB-4V6p5FKGXfqInOuQQSf5WwXr8lyIsn6yeaMwEI1KSuTTMBMNe6WN8bDtKg2REXTcF",
  "member_openid": "FE003FAF76C4817251FDC128A16753BB",
  "username": "痞孓小光光╮hw灰",
  "apply_at": "2026-08-05T16:21:40+08:00",
  "apply_source": "self_apply",
  "verify_info": {
    "method": "verify_message",
    "verify_message": "就快乐了"
  }
}
```

其他用户邀请用户入群

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AZj4L11PQ3oFrs2xf0wyfPmJ-3ONzbTr9MZRnXCSfoGce4KkWIgaTDwtkLXJVBaPx61VW9dzQz041oPt8o-JbBSyIerWVziQp1LaxYQCoyEx8rhffLwfBp5OW1-WL5C5HNji3M9lwDfZO4h_zNT4r0lywGojY4CX",
  "member_openid": "DE538D0B23260BFEC30EA4A17C3A71B1",
  "username": "吓唬",
  "apply_at": "2026-08-05T16:36:32+08:00",
  "apply_source": "invited",
  "invited_by": "FE003FAF76C4817251FDC128A16753BB"
}
```

用户入群申请自动申请通过

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AZ22mGUrkPeeNy6Fzz_raGskCnpnbdy7pIq6pME7XUgS72LOXTH4TxgzGlv3FmAGmNQAelRYYhBZYKgJUEoSgu21rSJVSdKOznbSu6FdXqXvZ10SkpI5fyE_876Va8KSbuLFbWdKa8Rh9nc_hzvZYKZT0_X1W0o4",
  "member_openid": "FE003FAF76C4817251FDC128A16753BB",
  "username": "痞孓小光光╮hw灰",
  "apply_at": "2026-08-05T17:32:52+08:00",
  "apply_source": "self_apply",
  "verify_info": {
    "method": "verify_message",
    "verify_message": "健健康康"
  },
  "auto_approved": {
    "strategy_id": "st_7c0b77d442"
  }
}
```
