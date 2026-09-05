# 创建指令面板

创建指令面板。支持 c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信）四种场景。其中 c2c 和 group 场景支持按指定用户或群生效（target_type=specific），channel 和 dm 场景仅支持全局配置（target_type=all）

- 一个机器人最多创建 20 个指令面板

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/panels |
| HTTP Method | POST |
| 接口频率限制 | 10 QPM |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| scope | string | 是 | 生效场景，可选值：c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信）。 四种场景均支持创建面板，但 channel 和 dm 场景仅支持全局配置（target_type 只能为 all） |
| target_type | string | 否 | 作用范围，可选值：all（对该场景下所有用户/群生效）、specific（仅对指定用户/群生效）。 仅 c2c 和 group 场景支持 specific；channel 和 dm 场景只能传 all |
| user_openids | []string | 否 | 用户 openid 列表，仅 c2c 场景且 target_type=specific 时有效。 指定面板对这些用户生效，一次最多传 20 个。后续可通过「修改指令面板关联对象」接口增删 |
| group_openids | []string | 否 | 群 openid 列表，仅 group 场景且 target_type=specific 时有效。 指定面板对这些群生效，一次最多传 20 个。后续可通过「修改指令面板关联对象」接口增删 |
| panel | Panel | 是 | 面板配置内容，定义面板中展示的指令和链接项 |

Panel

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| items | []PanelItem | 否 | 面板元素列表，定义面板中展示的指令或链接项，一个指令面板里最多配置 20 个面板元素 |
| remark | string | 否 | 面板备注，用于开发者标记面板用途，最多 255 个字符，不对用户展示 |
| version | integer | 否 | 当前版本号 |

PanelItem

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| name | string | 否 | 元素名称。type=command 时用户点击后该内容会填入聊天输入框；type=link 时仅用于面板展示 最多 14 个字符，约 7 个中文汉字 |
| desc | string | 否 | 元素描述，用于补充说明该指令或链接的功能，在面板中展示给用户 最多 30 个字符，约 15 个中文汉字 |
| type | string | 否 | 元素类型，可选值：command（指令）、link（链接跳转） |
| only_admin | boolean | 否 | 是否仅管理员可操作。true 时仅频道/群管理员可点击，false 时所有用户可点击 |
| link | string | 否 | 跳转链接 URL，仅 type=link 时有效。用户点击后在浏览器中打开该地址 |

### 请求示例

创建 c2c 全局面板

```text
{
  "scope": "c2c",
  "target_type": "all",
  "panel": {
    "items": [
      {
        "type": "command",
        "name": "查询天气",
        "desc": "查询当前天气"
      },
      {
        "type": "link",
        "name": "更多服务",
        "link": "https://example.com"
      }
    ],
    "remark": "C2C面板"
  }
}
```

创建 group 指定群面板

```text
{
  "scope": "group",
  "target_type": "specific",
  "group_openids": [
    "openid_group_001",
    "openid_group_002"
  ],
  "panel": {
    "items": [
      {
        "type": "command",
        "name": "群签到",
        "desc": "每日签到"
      }
    ]
  }
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| panel_id | string | 新创建的面板 ID。后续修改、删除、查询详情均需使用此 ID |

## 响应示例

成功

```json
{
  "panel_id": "p_x8k2x8k2x8k2"
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 40030008 | URL 格式错误 | 确认 URL 以 https:// 开头 |
| 40030009 | 指令面板操作进行中，请稍后重试 | 存在并发操作冲突，请稍后重试 |
| 40030011 | 生效场景不合法 | scope 仅支持 c2c/group/channel/dm |
| 40030012 | 生效范围不合法 | target_type 仅支持 all/specific；channel/dm 场景仅支持 all |
| 40030013 | 超出数量限制 | 请减少请求数量，具体限制值见返回信息中的 limit |
| 40030015 | 面板元素类型不合法 | panel_item.type 仅支持 command/link |
| 40030016 | 必填字段缺失 | 检查必填字段是否全部正确传入 |
| 40030018 | 当前场景不支持此操作 | 检查 scope 是否支持当前操作 |
| 40030020 | 内容存在安全风险，请修改后重试 | 请检查菜单/面板内容是否包含敏感信息 |
| 40030021 | 全局面板不支持添加指定关联对象 | target_type=all 的面板不支持此操作，请使用 specific 模式 |
