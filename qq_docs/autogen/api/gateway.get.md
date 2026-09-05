# 获取通用 WSS 接入点

获取 WSS 接入地址，通过该地址可建立 WebSocket 长连接。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /gateway |
| HTTP Method | GET |
| 接口频率限制 | 2 QPM / 10 QPM burst |

### 请求示例

获取通用WSS接入点

```text
GET /gateway
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| url | string | WebSocket 连接地址 |

## 响应示例

获取WSS网关地址成功

```json
{
  "url": "wss://qqbot-api.example.com/websocket"
}
```
