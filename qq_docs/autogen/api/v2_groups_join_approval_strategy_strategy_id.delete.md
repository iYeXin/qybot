# 删除入群自动审批策略

删除指定的入群自动审批策略。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy/{strategy_id} |
| HTTP Method | DELETE |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| strategy_id | string | 是 | 策略 ID |

### 请求示例

```text
DELETE /v2/groups/join_approval_strategy/st_d83eca11e9

{}
```

## 响应

无

## 响应示例

```json
{}
```
