# 查询指令面板详情

查询指定指令面板的完整配置详情，包括面板内容、生效场景、生效范围，以及关联的用户或群 openid 列表

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/panels/{panel_id} |
| HTTP Method | GET |
| 接口频率限制 | 30 QPM |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| panel_id | string | 是 | 面板 ID |

### 请求示例

查询面板详情

```text
GET /v2/panels/p_x8k2x8k2x8k2
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| panel_id | string | 面板 ID |
| scope | string | 生效场景，可选值：c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信） |
| target_type | string | 作用范围，可选值：all（全局配置）、specific（指定用户/群生效）。仅 c2c/group 场景可能为 specific |
| panel | Panel | 面板配置内容 |
| created_at | string | 面板创建时间，RFC3339 格式（如 2024-01-15T10:30:00Z） |
| updated_at | string | 面板更新时间，RFC3339 格式（如 2024-01-15T10:30:00Z） |
| version | integer | 面板版本号 |
| user_openids | []string | 关联的用户 openid 列表。仅 c2c 场景且 target_type=specific 时返回，最多 1000 条 |
| group_openids | []string | 关联的群 openid 列表。仅 group 场景且 target_type=specific 时返回，最多 1000 条 |

Panel

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| items | []PanelItem | 面板元素列表，定义面板中展示的指令或链接项，一个指令面板里最多配置 20 个面板元素 |
| remark | string | 面板备注，用于开发者标记面板用途，最多 255 个字符，不对用户展示 |
| version | integer | 当前版本号 |

PanelItem

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| name | string | 元素名称。type=command 时用户点击后该内容会填入聊天输入框；type=link 时仅用于面板展示 最多 14 个字符，约 7 个中文汉字 |
| desc | string | 元素描述，用于补充说明该指令或链接的功能，在面板中展示给用户 最多 30 个字符，约 15 个中文汉字 |
| type | string | 元素类型，可选值：command（指令）、link（链接跳转） |
| only_admin | boolean | 是否仅管理员可操作。true 时仅频道/群管理员可点击，false 时所有用户可点击 |
| link | string | 跳转链接 URL，仅 type=link 时有效。用户点击后在浏览器中打开该地址 |

## 响应示例

成功

```json
{
  "panel_id": "p_x8k2x8k2x8k2",
  "scope": "group",
  "target_type": "specific",
  "panel": {
    "items": [
      {
        "type": "command",
        "name": "群签到",
        "desc": "每日签到"
      }
    ]
  },
  "version": 1,
  "user_openids": [],
  "group_openids": [
    "openid_group_001"
  ]
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 40030006 | 指令面板不存在 | 确认 panel_id 是否正确 |
