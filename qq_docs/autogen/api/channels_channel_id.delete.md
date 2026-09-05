# 删除子频道

删除子频道。需要管理员权限。成功返回 HTTP 200。

需要管理员权限。私域接口，删除成功后会触发 CHANNEL_DELETE 事件。子频道删除后无法恢复。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /channels/{channel_id} |
| HTTP Method | DELETE |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| channel_id | string | 是 |  |

### 请求示例

示例1

```text
DELETE /channels/123456
```

## 响应

无

## 响应示例

示例1

```json
{}
```
