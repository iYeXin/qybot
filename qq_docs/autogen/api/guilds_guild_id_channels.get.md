# 获取子频道列表

获取指定频道下的子频道列表。

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /guilds/{guild_id}/channels |
| HTTP Method | GET |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| guild_id | string | 是 |  |

### 请求示例

示例1

```text
GET /guilds/123456789012345678/channels
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| channels | []Channel |  |

Channel

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 子频道 ID |
| guild_id | string | 所属频道 ID |
| name | string | 子频道名 |
| type | integer | 子频道类型: 0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛 |
| sub_type | integer | 子频道子类型（文字子频道）: 0=闲聊, 1=公告, 2=攻略, 3=开黑 |
| position | integer | 排序值，从 1 开始 |
| parent_id | string | 所属分组 ID（仅子频道有效） |
| owner_id | string | 创建人 ID |
| private_type | integer | 子频道私密类型: 0=公开, 1=群主管理员可见, 2=群主管理员+指定成员 |
| speak_permission | integer | 子频道发言权限: 0=无效, 1=所有人, 2=群主管理员+指定成员 |
| application_id | string | 应用子频道标识 |
| permissions | string | 用户拥有的子频道权限 |

## 响应示例

示例1

```json
[
  {
    "id": "123456",
    "guild_id": "123456789012345678",
    "name": "文字交流区",
    "type": 0,
    "sub_type": 0,
    "position": 1,
    "parent_id": "0",
    "owner_id": "123456789012345678",
    "private_type": 0,
    "speak_permission": 1
  },
  {
    "id": "123457",
    "guild_id": "123456789012345678",
    "name": "语音聊天室",
    "type": 2,
    "sub_type": 0,
    "position": 2,
    "parent_id": "0",
    "owner_id": "123456789012345678",
    "private_type": 0,
    "speak_permission": 1
  }
]
```
