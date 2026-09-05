# 结构化卡片消息

说明

达到准入条件的开发者，向平台运营申请后获得权限。

## 发送方式

选择合适的 结构化卡片消息（ARK） 模板，将模板变量以 key-value 对填充后发送。每个模板定义了自己的变量（`#XXX#`），变量类型可以是字符串、数组、URL 等。

### 数据结构

消息发送接口中 `ark` 字段的结构：

| 属性 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| template_id | int | 是 | 模板 ID，可选 23 / 24 / 37 |
| kv | kv 数组 | 是 | `[{key: "#变量#", value: "填充值"}]`，模板变量与填充值的映射 |

当变量类型为数组时，kv 元素使用 `obj` 嵌套数组结构：

```json
{
  "key": "#LIST#",
  "obj": [
    {
      "obj_kv": [
        { "key": "desc", "value": "文本" },
        { "key": "link", "value": "https://..." }
      ]
    }
  ]
}
```

### 请求示例

```json
{
  "ark": {
    "template_id": 23,
    "kv": [
      { "key": "#DESC#", "value": "机器人订阅消息" },
      { "key": "#PROMPT#", "value": "XX机器人" },
      { "key": "#TITLE#", "value": "XX机器人消息" },
      { "key": "#META_URL#", "value": "http://domain.com/" },
      {
        "key": "#META_LIST#",
        "obj": [
          {
            "obj_kv": [
              { "key": "name", "value": "aaa" },
              { "key": "age", "value": "3" }
            ]
          },
          {
            "obj_kv": [
              { "key": "name", "value": "bbb" },
              { "key": "age", "value": "4" }
            ]
          }
        ]
      }
    ]
  }
}
```

## 模板 23 — 链接+文本列表

模板 id = 23。

### 模板格式

```json
{
  "app": "com.tencent.channel.robot",
  "view": "albumAddPic",
  "ver": "0.0.0.1",
  "desc": "#DESC#",
  "prompt": "[QQ小程序]#PROMPT#",
  "meta": {
    "detail": {
      "list": "#LIST#"
    }
  }
}
```

### 字段说明

| 变量 | 类型 | 描述 |
| --- | --- | --- |
| #DESC# | string | 描述 |
| #PROMPT# | string | 提示消息 |
| #LIST# | array | 文本列表，每个元素为 `{desc, link}` |

#LIST# 元素结构：

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| desc | string | 文本内容 |
| link | string | 跳转链接（需提前报备），不填则仅显示文本 |

### 请求示例

```json
{
  "ark": {
    "template_id": 23,
    "kv": [
      { "key": "#DESC#", "value": "descaaaaaa" },
      { "key": "#PROMPT#", "value": "promptaaaa" },
      {
        "key": "#LIST#",
        "obj": [
          { "obj_kv": [{ "key": "desc", "value": "需求标题：UI问题解决" }] },
          { "obj_kv": [{ "key": "desc", "value": "当前状态\"体验中\"点击下列动作直接扭转状态到：" }] },
          {
            "obj_kv": [
              { "key": "desc", "value": "已评审" },
              { "key": "link", "value": "https://qun.qq.com" }
            ]
          },
          {
            "obj_kv": [
              { "key": "desc", "value": "已排期" },
              { "key": "link", "value": "https://qun.qq.com" }
            ]
          },
          {
            "obj_kv": [
              { "key": "desc", "value": "开发中" },
              { "key": "link", "value": "https://qun.qq.com" }
            ]
          },
          {
            "obj_kv": [
              { "key": "desc", "value": "增量测试中" },
              { "key": "link", "value": "https://qun.qq.com" }
            ]
          },
          { "obj_kv": [{ "key": "desc", "value": "请关注" }] }
        ]
      }
    ]
  }
}
```

## 模板 24 — 文本+缩略图

模板 id = 24。

### 模板格式

```json
{
  "app": "com.tencent.channelrobot.smallpic",
  "view": "albumAddPic",
  "ver": "0.0.0.1",
  "desc": "#DESC#",
  "prompt": "[QQ小程序]#PROMPT#",
  "meta": {
    "detail": {
      "title": "#TITLE#",
      "desc": "#METADESC#",
      "img": "#IMG#",
      "link": "#LINK#",
      "subTitle": "#SUBTITLE#"
    }
  }
}
```

### 字段说明

| 变量 | 类型 | 描述 |
| --- | --- | --- |
| #DESC# | string | 描述 |
| #PROMPT# | string | 提示文本 |
| #TITLE# | string | 标题 |
| #METADESC# | string | 详情描述 |
| #IMG# | string | 图片链接 |
| #LINK# | string | 跳转链接 |
| #SUBTITLE# | string | 来源 |

### 请求示例

```json
{
  "ark": {
    "template_id": 24,
    "kv": [
      { "key": "#DESC#", "value": "..." },
      { "key": "#PROMPT#", "value": "通知信息" },
      { "key": "#TITLE#", "value": "标题" },
      { "key": "#METADESC#", "value": "Meta描述" },
      { "key": "#IMG#", "value": "https://pub.idqqimg.com/pc/misc/files/20190820/2f4e70ae3355ece23d161cf5334d4fc1jzjfmtep.png" },
      { "key": "#LINK#", "value": "https://qq.com" },
      { "key": "#SUBTITLE#", "value": "子标题" }
    ]
  }
}
```

## 模板 37 — 大图

模板 id = 37。

### 模板格式

```json
{
  "app": "com.tencent.imagetextbot",
  "view": "index",
  "ver": "1.0.0.11",
  "prompt": "#PROMPT#",
  "meta": {
    "robot": {
      "title": "#METATITLE#",
      "subtitle": "#METASUBTITLE#",
      "cover": "#METACOVER#",
      "jump_url": "#METAURL#"
    }
  }
}
```

### 字段说明

| 变量 | 类型 | 描述 |
| --- | --- | --- |
| #PROMPT# | string | 提示消息 |
| #METATITLE# | string | 标题 |
| #METASUBTITLE# | string | 子标题 |
| #METACOVER# | string | 大图，尺寸 975×540 |
| #METAURL# | string | 跳转链接 |

### 请求示例

```json
{
  "ark": {
    "template_id": 37,
    "kv": [
      { "key": "#PROMPT#", "value": "通知提醒" },
      { "key": "#METATITLE#", "value": "标题" },
      { "key": "#METASUBTITLE#", "value": "子标题" },
      { "key": "#METACOVER#", "value": "https://vfiles.gtimg.cn/vupload/20211029/bf0ed01635493790634.jpg" },
      { "key": "#METAURL#", "value": "https://qq.com" }
    ]
  }
}
```
