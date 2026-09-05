# 互动事件响应

收到 INTERACTION_CREATE 事件后需调用此接口回应，告知 QQ 后台事件已收到。 否则客户端会一直处于 loading 状态直到超时。

仅 type=11（消息按钮）和 type=12（快捷菜单）的互动事件需要调用此接口回应，其他类型无需回应（调用也不会报错）。需在事件触发的有效时间内回应，超时后 interaction_id 失效。同一 interaction_id 只能回应一次。code=0 时，对于 type=14（清空会话），后台会下发会话已清空小灰条提示用户。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /interactions/{interaction_id} |
| HTTP Method | PUT |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| interaction_id | string | 是 | 互动事件 ID，从 INTERACTION_CREATE 事件的 d.id 字段获取，注意该 ID 不带“INTERACTION_CREATE:”前缀 |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| code | integer | 否 | 回调结果。0=成功, 1=操作失败, 2=操作频繁, 3=重复操作, 4=没有权限, 5=仅管理员操作 |

### 请求示例

互动事件响应

```text
PUT /interactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
{
  "code": 0
}
```

## 响应

无

## 响应示例

成功

```json
{}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 630001 | param invalid | 请检查请求参数是否正确 |
| 630002 | get appid failed | 请检查 Authorization Header 是否正确 |
| 630003 | appid invalid | AppID 与 interaction_id 不匹配，请确认使用正确的 Bot Token |
| 630004 | set interaction data failed | 请稍后重试 |
| 630005 | get interaction data failed | 请稍后重试 |
| 630006 | get header appid failed | 请检查请求 Header |
| 630007 | data too large | 请减小请求体大小 |
| 630008 | interaction preprocess failed | 请检查请求参数 |
