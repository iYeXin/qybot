# 设置群成员禁言

设置群成员级禁言。

机器人需拥有群管理员身份，最大禁言时长为 30 天。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/restrict_chat_setting |
| HTTP Method | POST |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群OpenID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| members | []SetMemberMuteState | 否 | 用户禁言列表；每项通过 op 控制增/改/删， 单次设置不能超过 20 个 |

SetMemberMuteState

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| op | string | 是 | 操作类型：add 增加禁言，update 更新禁言到期时间，del 解除禁言 |
| member_openid | string | 是 | 注意：增加/更新时，只能操作普通成员，不能操作群主，管理员，机器人 被禁言成员的 openid |
| mute_expire_at | string | 否 | 禁言到期时间（RFC3339 格式）；op=del 时可传空串表示立即解除禁言 |

### 请求示例

**禁言指定用户 **

```text
POST /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/restrict_chat_setting

{
    "members": [
        {
            "op": "add",
            "member_openid": "EC58D87F598C8294A533B9D458DAAF33",
            "mute_expire_at": "2026-08-05T11:23:05+08:00"
        }
    ]
}
```

## 响应

无

## 响应示例

```json
{}
```
