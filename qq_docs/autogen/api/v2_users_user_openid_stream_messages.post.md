# 流式发送单聊消息

流式分批发送单聊消息。每个分片使用相同 stream_msg_id， index 从0递增。支持 markdown 内容格式。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/users/{user_openid}/stream_messages |
| HTTP Method | POST |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| user_openid | string | 是 |  |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| input_mode | string | 否 | 输入模式。 append（默认）：ContentRaw 拼接到 Pending。 replace：ContentRaw 为当前全量正文，须以上游已下发前缀 SentContent 开头；合并后 Pending 仅存未下发后缀。 |
| input_state | integer | 否 | 输入状态。1=生成中，10=生成结束 |
| index | integer | 否 | 分片序号，从0递增 |
| content_type | string | 否 | 内容格式类型 text: 文本消息 markdown：MarkDown消息 |
| content_raw | string | 否 | Markdown 格式的文本内容 |
| event_id | string | 否 | 被动回复事件ID（与 msg_id 二选一） |
| msg_id | string | 否 | 被动回复消息ID（与 event_id 二选一） |
| stream_msg_id | string | 否 | 流式消息ID。第一条由服务端生成并返回，后续分片需携带上一分片返回的 id |
| msg_seq | integer | 否 | 消息序号，用于去重 |
| is_wakeup | boolean | 否 | 是否为召回消息。true 时不校验 msg_id/event_id 有效期 |

### 请求示例

首片消息 (input_state=1, index=0)

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/stream_messages
{
  "input_mode": "replace",
  "input_state": 1,
  "index": 0,
  "content_type": "markdown",
  "content_raw": "正在生成回答，请稍候",
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "msg_seq": 1
}
```

续片消息 (input_state=1, index=1)

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/stream_messages
{
  "input_mode": "replace",
  "input_state": 1,
  "index": 1,
  "content_type": "markdown",
  "content_raw": "正在生成回答，请稍候。目前已完成大部分内容",
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "stream_msg_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "msg_seq": 1
}
```

结束片消息 (input_state=10)

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/stream_messages
{
  "input_mode": "replace",
  "input_state": 10,
  "index": 2,
  "content_type": "markdown",
  "content_raw": "正在生成回答，请稍候。目前已完成全部内容，以下是最终结果。",
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "stream_msg_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "msg_seq": 1
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 消息ID。首条返回 stream_msg_id，用于后续分片 |
| timestamp | string | 消息发送时间，RFC3339 格式 |
| ext_info | MessageExtInfo | 扩展信息。ref_idx: 引用消息索引 扩展信息 |
| remain_msg_len | integer | 流式消息剩余长度（字符数） |

MessageExtInfo

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| ref_idx | string | 引用消息索引。对应消息时间ext里的msg_idx与ref_msg_idx |

## 响应示例

首片响应（返回 stream_msg_id）

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-07-21T10:00:00+08:00",
  "ext_info": {
    "ref_idx": "REFIDX_xxxxxxxxxxxxxxx=="
  }
}
```

续片/结束片响应

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-07-21T10:00:01+08:00",
  "ext_info": {
    "ref_idx": "REFIDX_xxxxxxxxxxxxxxx=="
  }
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 40007 | 已下发内容前缀不可修改 | 请保持已下发内容前缀一致 |
| 50001 | 服务内部错误 | 请稍后重试 |
| 50002 | 频率限制 | 请降低调用频率 |
