# 修改全局自定义菜单

修改自定义菜单。自定义菜单仅支持 C2C（单聊）场景，设置后对所有用户生效，不支持按用户维度区分

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/menu |
| HTTP Method | PUT |
| 接口频率限制 | 5 QPM |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| menu | Menu | 否 | 菜单配置。传入后会覆盖原有的完整菜单配置 |

Menu

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| items | []MenuItem | 否 | 菜单项列表，最多 10 个，按列表顺序从左到右展示 |

MenuItem

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| name | string | 否 | 按钮名称，最多 10 个字符，一个中文汉字算2个字符 |
| type | string | 否 | 按钮类型，可选值：switch（开关）、send_message（发送消息）、link（链接跳转）、menu（含子菜单的折叠项） |
| sub_menu_items | []SubMenuItem | 否 | 子菜单列表，仅 type=menu 时有效。子菜单最多 5 个，不支持再嵌套子菜单 |
| send_message | string | 否 | 发送的内容，仅 type=send_message 时有效。用户点击后该文本会自动填入聊天输入框 |
| link | string | 否 | 跳转链接 URL，仅 type=link 时有效。用户点击后跳转到该地址，链接必须以https://开头 |
| switch | Switch | 否 | 开关配置，仅 type=switch 时有效。定义开关的标识和默认状态 |

SubMenuItem

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| name | string | 否 | 按钮名称，最多 14 个字符，约7个中文汉字 |
| type | string | 否 | 按钮类型，可选值：send_message（发送消息）、link（链接跳转）。二级菜单不支持 menu 类型 |
| send_message | string | 否 | 发送的内容，仅 type=send_message 时有效。用户点击后该文本会自动填入聊天输入框 |
| link | string | 否 | 跳转链接 URL，仅 type=link 时有效。用户点击后跳转到该地址，链接必须以https://开头 |

Switch

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| switch_id | string | 否 | 开关唯一标识。用户切换开关状态后会发送一条消息，消息内容中会携带此字段。 例如 switch_id 为 "search" 时，用户打开开关后消息的ext字段中会携带 "search=1"的标识，关闭后不会携带这个标识 |
| default | boolean | 否 | 开关的初始状态。true 表示默认打开，false 表示默认关闭 |

### 请求示例

创建包含多种类型的菜单

```text
{
  "menu": {
    "items": [
      {
        "type": "send_message",
        "name": "帮助",
        "send_message": "/help"
      },
      {
        "type": "link",
        "name": "官网",
        "link": "https://example.com"
      },
      {
        "type": "menu",
        "name": "更多",
        "sub_menu_items": [
          {
            "type": "send_message",
            "name": "设置",
            "send_message": "/settings"
          }
        ]
      }
    ]
  }
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| version | integer | 本次修改后的菜单版本号，可用于后续判断配置是否有变更 |

## 响应示例

成功

```json
{
  "version": 1
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 40030008 | URL 格式错误 | 确认 URL 以 https:// 开头 |
| 40030013 | 超出数量限制 | 请减少请求数量，具体限制值见返回信息中的 limit |
| 40030014 | 菜单类型不合法 | menu.type 仅支持 switch/send_message/link/menu |
| 40030016 | 必填字段缺失 | 检查必填字段是否全部正确传入 |
| 40030020 | 内容存在安全风险，请修改后重试 | 请检查菜单/面板内容是否包含敏感信息 |
