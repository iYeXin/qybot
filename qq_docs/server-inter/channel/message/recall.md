# 撤回子频道消息

### 接口

```http
DELETE /channels/{channel_id}/messages/{message_id}?hidetip=false
```

### 参数

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| hidetip | bool | 选填，是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false |

### 功能描述

用于撤回子频道 `channel_id` 下的消息 `message_id`

- 管理员可以撤回普通成员的消息。
- 频道主可以撤回所有人的消息。

注意

- 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
- 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

### Content-Type

```http
application/json
```

### 返回

成功返回 HTTP 状态码 `200`。

### 错误码

详见错误码。

### 示例

请求数据包

```http
DELETE /channels/123456/messages/112233
```
