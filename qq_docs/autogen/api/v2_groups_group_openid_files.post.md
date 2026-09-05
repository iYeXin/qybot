# 群聊富媒体上传

上传图片/视频/语音到群聊，返回 file_info 用于发送消息接口的 media 字段。 srv_send_msg=true 时直接发送消息并占用主动消息频次；false 时仅返回 file_info。 用群接口上传的文件仅能发送到群聊。 文件类型与大小限制:

- 1=图片(png/jpg): 软限制 20MB, 硬限制 200MB
- 2=视频(mp4): 软限制 30MB, 硬限制 200MB
- 3=语音(silk): 软限制 20MB, 硬限制 200MB
- 4=文件: 软限制 200MB, 硬限制 200MB 超过软限制会降级为文件类型上传，超过硬限制会报错。

支持两种上传方式：

1. URL 上传：传入 url，平台下载转存
2. 分片上传合并：先通过 upload_prepare + upload_part_finish 完成分片上传，再携带 upload_id 调用本接口完成合并

推荐使用分片上传，流程如下：

1. 调用 upload_prepare 获取 upload_id、block_size 和各分片预签名 URL
2. 按 block_size 将文件分片，逐片 HTTP PUT 到对应的预签名 URL
3. 每片 PUT 成功后调用 upload_part_finish 通知服务端该分片完成
4. 全部分片完成后，携带 upload_id 调用本接口完成合并，返回 file_info

## 请求

### 基础信息

| 字段 | 值 |
| --- | --- |
| HTTP URL | /v2/groups/{group_openid}/files |
| HTTP Method | POST |
| 接口频率限制 | 50 QPS |

## 路径参数

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| group_openid | string | 是 | 群 OpenID |

## 请求体

| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| file_type | integer | 否 | 媒体类型。1=图片, 2=视频, 3=语音, 4=文件 图片支持 png/jpg，视频支持 mp4，语音支持 silk |
| url | string | 否 | 媒体资源的 URL，需以 http 开头，平台会下载并转存 分片上传合并时可为空 |
| srv_send_msg | boolean | 否 | true=直接发送消息并占用主动消息频次，返回中包含消息 ID false=仅返回 file_info，用于后续发送消息接口的 media 字段 |
| file_name | string | 否 | 文件名（可选） |
| upload_id | string | 否 | 分片上传任务 ID。来自 UploadPrepare 响应的 upload_id， 传入后走分片上传合并路径，url 可为空 |

### 请求示例

URL 上传图片

```text
POST /v2/groups/B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5/files
{
  "file_type": 1,
  "url": "https://example.com/image.png",
  "srv_send_msg": false
}
```

分片上传合并

```text
POST /v2/groups/B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5/files
{
  "file_type": 2,
  "srv_send_msg": false,
  "file_name": "video.mp4",
  "upload_id": "upload_a1b2c3d4e5f6"
}
```

## 响应

### 响应体

| 名称 | 类型 | 描述 |
| --- | --- | --- |
| file_uuid | string | 文件唯一 ID |
| file_info | string | 文件信息，用于发送消息接口的 media.file_info 字段。 内部为序列化的二进制数据，开发者无需解析，直接透传即可 |
| ttl | integer | file_info 有效期（秒）。到期后需重新上传。 0 表示可长期使用 |
| id | string | 发送消息的唯一 ID。仅 srv_send_msg=true 时返回 |
| raw_url | string | 文件下载链接（COS 预签名 GET URL），有效期与 ttl 一致 仅分片上传合并（upload_id 路径）且 file_type 为图片/视频/语音时返回； URL 直传和文件类型(file_type=4)不返回此字段 |

## 响应示例

上传成功

```json
{
  "file_uuid": "uuid_a1b2c3d4e5f6",
  "file_info": "AE86C5D3F0E14B238C656C0F6DD1D0479C",
  "ttl": 300
}
```

### 错误码

| 错误码 | 描述 | 排查建议 |
| --- | --- | --- |
| 850018 | 群被禁言或者机器人被禁言 | 请检查机器人是否被禁言 |
| 850019 | 不支持的文件格式 | 请检查 file_type 是否正确 |
| 850026 | 下载原始文件失败 | 请检查 URL 是否可访问或重试 |
| 850031 | 上传文件超过大小限制 | 请减小文件大小 |
| 850027 | 发送数据超时 | 请稍后重试 |
| 10000 | 不支持的操作 | 请检查请求参数 |
| 40093001 | 文件上传失败，请重试 | 大文件分片上传中 BDH 通道异常，请重试 |
| 40093002 | 超过今天发送文件容量上限 | 请明天再试或减少文件大小 |
