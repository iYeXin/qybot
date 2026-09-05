# 生成分享链接

生成机器人分享链接，用于邀请用户添加机器人为好友。

生成带自定义参数的机器人分享链接，用于邀请用户添加机器人为好友。用户通过该链接添加机器人时，callback_data 参数会透传给开发者。callback_data 最长 32 字符。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/generate_url_link |
| HTTP Method | POST |
| 接口频率限制 | 50 QPS |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| url_link | string | 否 | 需要跳转的 URL |

### 请求示例

生成分享链接

```text
POST /v2/generate_url_link
{
  "callback_data": "custom_data_123"
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| url_link | string | 生成的分享链接 |

## 响应示例

生成分享链接成功

```json
{
  "url_link": "https://qun.qq.com/qunpro/robot/qunshare?robot_appid=1234567890&robot_uin=12345678&data=xxx"
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 10001 | 请求参数异常 | 请检查请求参数是否正确 |
| 10002 | 请求头异常 | 请检查请求头是否正确 |
| 10003 | 查询机器人信息异常 | 请确认机器人是否存在 |
| 10044 | 从协议头获取uin失败 | 请检查 Authorization Header 是否正确 |
| 11004 | 生成分享ARK失败 | 请稍后重试 |
