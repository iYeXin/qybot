# 执行入群自动审批策略

对策略关联的全部群发起全量扫描，命中白名单号码的入群申请自动审批通过。异步执行，约 10 分钟完成。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/join_approval_strategy/{strategy_id}/execute |
| HTTP Method | POST |
| 接口频率限制 | 60 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| strategy_id | string | 是 | 策略 ID |

### 请求示例

```text
POST /v2/groups/join_approval_strategy/st_d83eca11e9/execute
{}
```

## 响应

无

## 响应示例

```json
{}
```
