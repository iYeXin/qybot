# 获取机器人加入的频道列表

获取当前用户（机器人）所加入的频道列表，支持分页。 Bot Token 获取机器人数据，Bearer Token 获取用户数据。

- limit 默认 100，最大 100

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /users/@me/guilds |
| HTTP Method | GET |
| 接口频率限制 | 50 QPS |

### 查询参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| before | string | 否 | 读取此 guild_id 之前的数据。设置时先反序再分页 |
| after | string | 否 | 读取此 guild_id 之后的数据。与 before 同时设置时 after 无效 |
| limit | integer | 否 | 每次拉取条数，默认 100，最大 100 |

### 请求示例

获取当前用户频道列表

```text
GET /users/@me/guilds?limit=20
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| guilds | []GuildInfo |  |

GuildInfo

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 频道 ID |
| name | string | 频道名称 |
| icon | string | 频道头像 URL |
| owner_id | string | 频道创建者 ID |
| owner | boolean | 当前用户是否为频道创建者 |
| joined_at | string | 加入时间，ISO8601 格式 |
| member_count | integer | 频道成员数 |
| max_members | integer | 频道成员上限 |
| description | string | 频道简介 |

## 响应示例

获取机器人加入的频道列表成功

```json
[
  {
    "id": "2452178231489345741",
    "name": "读书分享会",
    "icon": "https://groupprohead.gtimg.cn/11259151665662004/40?t=1667468494556",
    "owner_id": "17481532452010052342",
    "owner": false,
    "joined_at": "2025-01-09T15:17:23+08:00",
    "member_count": 6,
    "max_members": 5000000,
    "description": "一起读书，共同成长"
  },
  {
    "id": "16038617105584902418",
    "name": "英语学习角",
    "icon": "https://groupprohead.gtimg.cn/76199361644746202/40?t=1655214551877",
    "owner_id": "12015059872407927338",
    "owner": false,
    "joined_at": "2026-05-12T20:39:33+08:00",
    "member_count": 35,
    "max_members": 5000000,
    "description": "分享英语学习资源，欢迎爱学习的伙伴来交流"
  },
  {
    "id": "9160663460093593400",
    "name": "早起打卡群",
    "icon": "https://groupprohead.gtimg.cn/89330271757059034/40?t=1781084183385",
    "owner_id": "1570904394246748593",
    "owner": true,
    "joined_at": "2026-05-15T10:57:07+08:00",
    "member_count": 13,
    "max_members": 10000,
    "description": "每天早起打卡，养成好习惯"
  }
]
```
