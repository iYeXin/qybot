# 群@机器人消息

用户在群里@机器人发送消息时触发。这是机器人最常接收的事件。 content 字段已自动去除@机器人的前缀。 为确保消息可达，相同 msg_id 可能重复推送，开发者需结合 msg_seq 做去重。

## 事件

| 字段 | 值 |
| --- | --- |
| 事件名 | GROUP_AT_MESSAGE_CREATE |
| Intent | GROUP_AND_C2C_EVENT (1<<25) |

### 事件体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 消息 ID，可用于被动回复和撤回 |
| author | User | 发送者（member_openid 有值） |
| content | string | 消息文本内容（已去除@机器人的前缀） |
| group_openid | string | 群 OpenID |
| timestamp | string | 消息发送时间，RFC3339 格式 |
| message_type | integer | 消息内容类型（同 C2C_MESSAGE_CREATE） |
| message_scene | MessageScene | 消息场景上下文 |
| attachments | []MessageAttachment | 消息附件 |
| mentions | []User | 消息中@的用户列表（不含@机器人自身） |
| ark_data | ARKData | 结构化卡片消息数据 |
| msg_elements | []MsgElement | 消息元素列表 |

User

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| id | string | 用户唯一标识（OpenID 格式） |
| username | string | 用户昵称 |
| bot | boolean | 是否为机器人 |
| union_openid | string | 跨应用统一用户 OpenID（可能为空） |
| union_user_account | string | 跨应用统一用户账号（可能为空） |
| user_openid | string | 用户 OpenID（单聊场景使用） |
| member_openid | string | 群成员 OpenID（群聊场景使用） |
| member_role | string | 群内角色。member=普通成员, admin=管理员, owner=群主 |

MessageScene

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| source | string | 场景来源。default=默认聊天窗口 |
| ext | []string | 扩展数据列表，key=value 格式: msg_idx=消息索引, 用于引用场景 ref_msg_idx=引用的消息索引 auth_token=鉴权令牌 |

MessageAttachment

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| url | string | 附件下载 URL |
| filename | string | 文件名 |
| width | integer | 图片宽度（像素），非图片附件无此字段 |
| height | integer | 图片高度（像素），非图片附件无此字段 |
| size | integer | 文件大小（字节） |
| content_type | string | 附件内容类型（MIME 类型）: voice=语音消息 image/jpeg=JPEG 图片 image/png=PNG 图片 image/gif=GIF 图片 video/mp4=MP4 视频 file=群文件 |
| voice_wav_url | string | 语音消息 SILK 等转换后的 WAV 文件 URL |
| asr_refer_text | string | 语音消息 ASR 参考结果 |

ARKData

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| prompt | string | 卡片消息中的用户操作提示文本 |
| ark_type | string | 卡片消息类型标识: tuwen = 图文 H5（如快手分享链接） feed = 图文卡片（群相册、频道帖子、分享卡片） miniapp = 小程序（微信小程序、QQ 小程序、哔哩哔哩等） map = 位置卡片 contact_card = 好友名片 video_share = 视频分享 music_together = 一起听歌 |
| ark_name | string | 卡片消息类型的中文名称，如"图文 H5"、"小程序"、"图文卡片" |
| fields | object | 卡片消息字段，常见键名: tag/tags=来源标签, title=标题, desc=描述, jump_url=跳转链接, preview=预览图, source=来源名称, source_logo=来源图标, tag_icon=标签图标, nickname=昵称, avatar=头像, address=地址 |

MsgElement

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| msg_idx | string | 消息元素在列表中的引用消息索引 |
| author | User | 该元素对应的消息发送者 |
| message_type | integer | 消息内容类型: 0=普通文本, 3=结构化卡片, 101=并行消息, 102=聊天记录, 103=引用消息 |
| content | string | 消息正文内容 |
| attachments | []MessageAttachment | 该元素携带的附件 |
| ark_data | ARKData | 结构化卡片消息数据（message_type=3 时有值） |
| msg_elements | []MsgElement | 嵌套消息元素列表（递归结构） |

### 事件示例

示例1

```text
{
  "id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "author": {
    "id": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
    "member_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
    "member_role": "member",
    "username": "小明",
    "bot": false
  },
  "content": " /今日天气 ",
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "message_type": 0,
  "timestamp": "2026-07-21T10:00:00+08:00",
  "message_scene": {
    "source": "default",
    "ext": [
      "msg_idx=REFIDX_xxxxxxxxxxxxxxx==",
      "auth_token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ]
  }
}
```

示例2

```text
{
  "id": "ROBOT1.0_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  "author": {
    "id": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6",
    "member_openid": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6",
    "member_role": "member",
    "username": "小红",
    "bot": false
  },
  "content": " 看看这张风景照 ",
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "message_type": 0,
  "timestamp": "2026-07-21T10:05:00+08:00",
  "attachments": [
    {
      "content_type": "image/jpeg",
      "filename": "photo.jpg",
      "url": "https://multimedia.nt.qq.com.cn/download?appid=xxx&fileid=xxx&rkey=xxx&spec=0",
      "width": 1920,
      "height": 1080,
      "size": 256000
    }
  ],
  "message_scene": {
    "source": "default",
    "ext": [
      "msg_idx=REFIDX_yyyyyyyyyyyyyyy==",
      "auth_token=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
    ]
  }
}
```

示例3

```text
{
  "id": "ROBOT1.0_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
  "author": {
    "id": "D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1",
    "member_openid": "D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1",
    "member_role": "owner",
    "username": "小华",
    "bot": false
  },
  "content": " ",
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "message_type": 103,
  "timestamp": "2026-07-21T10:10:00+08:00",
  "msg_elements": [
    {
      "content": "=== 消息 1 ===\n[消息内容] 今天的学习计划已完成\n\n=== 消息 2 ===\n[消息内容] 很棒！继续保持，明天继续加油\n\n=== 消息 3 ===\n[消息内容] 好的，一起进步！"
    }
  ],
  "message_scene": {
    "source": "default",
    "ext": [
      "msg_idx=REFIDX_zzzzzzzzzzzzzzz==",
      "auth_token=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "ref_msg_idx=TMP_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ]
  }
}
```
