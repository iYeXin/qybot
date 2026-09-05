# 查询全局自定义菜单

查询当前已设置的自定义菜单配置

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/menu |
| HTTP Method | GET |
| 接口频率限制 | 30 QPM |

### 请求示例

查询当前菜单

```text
GET /v2/menu
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| version | integer | 当前菜单的版本号 |
| menu | Menu | 当前生效的菜单配置。未设置过菜单时该字段为空 |

Menu

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| items | []MenuItem | 菜单项列表，最多 10 个，按列表顺序从左到右展示 |

MenuItem

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| name | string | 按钮名称，最多 10 个字符，一个中文汉字算2个字符 |
| type | string | 按钮类型，可选值：switch（开关）、send_message（发送消息）、link（链接跳转）、menu（含子菜单的折叠项） |
| sub_menu_items | []SubMenuItem | 子菜单列表，仅 type=menu 时有效。子菜单最多 5 个，不支持再嵌套子菜单 |
| send_message | string | 发送的内容，仅 type=send_message 时有效。用户点击后该文本会自动填入聊天输入框 |
| link | string | 跳转链接 URL，仅 type=link 时有效。用户点击后跳转到该地址，链接必须以https://开头 |
| switch | Switch | 开关配置，仅 type=switch 时有效。定义开关的标识和默认状态 |

SubMenuItem

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| name | string | 按钮名称，最多 14 个字符，约7个中文汉字 |
| type | string | 按钮类型，可选值：send_message（发送消息）、link（链接跳转）。二级菜单不支持 menu 类型 |
| send_message | string | 发送的内容，仅 type=send_message 时有效。用户点击后该文本会自动填入聊天输入框 |
| link | string | 跳转链接 URL，仅 type=link 时有效。用户点击后跳转到该地址，链接必须以https://开头 |

Switch

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| switch_id | string | 开关唯一标识。用户切换开关状态后会发送一条消息，消息内容中会携带此字段。 例如 switch_id 为 "search" 时，用户打开开关后消息的ext字段中会携带 "search=1"的标识，关闭后不会携带这个标识 |
| default | boolean | 开关的初始状态。true 表示默认打开，false 表示默认关闭 |

## 响应示例

成功

```json
{
  "menu": {
    "items": [
      {
        "type": "send_message",
        "name": "帮助",
        "send_message": "/help"
      }
    ]
  },
  "version": 1
}
```
