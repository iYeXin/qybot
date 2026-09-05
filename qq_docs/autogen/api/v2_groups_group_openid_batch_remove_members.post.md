# 群成员批量移除

批量移除群成员，单次最多 20 个，可选择同时加入黑名单。

该能力正在内邀接入中，敬请期待

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/batch_remove_members |
| HTTP Method | POST |
| 接口频率限制 | 30 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群OpenID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| member_openids | []string | 是 | 需要移除的成员 member_openid 列表，单次最多 20 个 |
| add_to_member_blacklist | boolean | 否 | 是否同时加入群黑名单，默认 false |

### 请求示例

```text
POST /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/batch_remove_members
{
    "member_openids": [
        "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D"
    ]
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| remove_members_result | string | 成功时返回 success |
| add_to_member_blacklist_fail_openids | []string | 拉黑失败的 openid |

## 响应示例

```json
{
    "remove_members_result": "success",
    "add_to_member_blacklist_fail_openids": []
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 11253 | 应用无接口访问权限 | 该接口仅白名单机器人可用，请联系平台运营申请权限 |
