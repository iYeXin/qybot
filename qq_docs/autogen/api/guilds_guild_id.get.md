# 获取频道详情

获取指定频道的基本信息。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /guilds/{guild_id} |
| HTTP Method | GET |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| guild_id | string | 是 |  |

### 请求示例

示例1

```text
GET /guilds/123456789012345678
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 频道 ID |
| name | string | 频道名称 |
| icon | string | 频道头像 URL |
| owner_id | string | 创建者用户 ID |
| owner | boolean | 当前机器人是否为创建者 |
| member_count | integer | 成员数 |
| max_members | integer | 最大成员数 |
| description | string | 频道描述 |
| joined_at | string | 加入时间，ISO8601 格式 |

## 响应示例

示例1

```json
{
  "id": "123456789012345678",
  "name": "技术交流频道",
  "icon": "https://thirdqq.qlogo.cn/0",
  "owner_id": "123456789012345678",
  "owner": false,
  "member_count": 100,
  "max_members": 1000,
  "description": "专注于技术分享与交流的频道",
  "joined_at": "2026-01-01T00:00:00+08:00"
}
```
