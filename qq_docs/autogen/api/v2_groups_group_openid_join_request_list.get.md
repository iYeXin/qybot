# 入群申请列表拉取

拉取入群申请列表，支持分页。

机器人需拥有群管理员身份。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/join_request_list |
| HTTP Method | GET |
| 接口频率限制 | 30 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群OpenID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| cursor | string | 否 | 分页游标，首次请求可不传或传空串 |
| limit | integer | 否 | 单页数量，默认 20，最大 50 |

### 请求示例

```text
GET /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/join_request_list
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| list | []JoinRequest | 入群申请列表 |
| next_cursor | string | 下一页游标，空串表示已到末页 |

JoinRequest

| 名称 | 类型 | 描述 |
| --- | --- | --- |
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

## 响应示例

```json
{
  "list": [
    {
      "join_request_id": "Ael-dmvlRdC9fZepnrfMhamsZgO103pSjmzwUz5SyyORaQMX-q0zkY3Q1caz71KiH2nJzehE-QWM-xCWzIsLg1i1vAPkdJfdPkUDVImXoiR8OY_s40J7OsFZGaEFUdDkIhAPs9uMXOxNpW91mGWQTlaFnmgksAxk",
      "risk_tips": "",
      "union_openid": "FE003FAF76C4817251FDC128A16753BB",
      "member_openid": "FE003FAF76C4817251FDC128A16753BB",
      "username": "痞孓小光光╮hw灰",
      "apply_at": "2026-08-05T14:19:09+08:00",
      "apply_source": "self_apply",
      "invited_by": "",
      "bot": false,
      "verify_info": {
        "method": "verify_message",
        "verify_message": "几款看看",
        "review_qa_list": []
      }
    }
  ],
  "next_cursor": "1785767153250497"
}
```
