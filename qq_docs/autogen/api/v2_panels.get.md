# 查询指令面板列表

分页拉取指定场景下已生效的指令面板列表，按设置时间倒序排列。必须传入 scope 参数进行场景筛选

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/panels |
| HTTP Method | GET |
| 接口频率限制 | 30 QPM |

### 查询参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| scope | string | 是 | 生效场景，可选值：c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信）。 按指定场景筛选面板列表 |
| cursor | string | 否 | 分页游标。首次请求不传或传空串，后续请求传入上次响应中的 next_cursor 值 |
| limit | integer | 否 | 每页拉取条数，默认 20，最大 50 |

### 请求示例

查询 c2c 场景面板（第一页）

```text
GET /v2/panels?scope=c2c&limit=10
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| records | []PanelRecord | 面板记录列表，按设置时间倒序排列 |
| next_cursor | string | 下一页游标。空串表示已到最后一页，无更多数据 |
| is_end | boolean | 是否已拉取到最后一页。true 表示无更多数据 |

PanelRecord

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| panel_id | string | 面板 ID |
| scope | string | 生效场景，可选值：c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信） |
| target_type | string | 作用范围，可选值：all（全局配置）、specific（指定用户/群生效）。仅 c2c/group 场景可能为 specific |
| panel | Panel | 面板配置内容 |
| created_at | string | 面板创建时间，RFC3339 格式（如 2024-01-15T10:30:00Z） |
| updated_at | string | 面板更新时间，RFC3339 格式（如 2024-01-15T10:30:00Z） |
| version | integer | 面板版本号 |

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
  "records": [
    {
      "panel_id": "p_102030405_x8k2",
      "scope": "c2c",
      "target_type": "all",
      "panel": {
        "items": [
          {
            "type": "command",
            "name": "查询天气",
            "desc": "查询当前天气"
          }
        ]
      },
      "version": 1
    }
  ],
  "next_cursor": "",
  "is_end": true
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 40030001 | 参数错误 | 检查请求参数是否正确 |
| 40030011 | 生效场景不合法 | scope 仅支持 c2c/group/channel/dm |
