# 启动接入

## 账号注册

QQ 机器人：一个机器人可以被添加到 `群聊/频道` 内互动对话，QQ 用户也可以直接跟机器人 `单独对话`。

注册地址：QQ 开放平台官网(opens new window)

## 接入票据

注册创建机器人后：获得的开发机器人接入票据 `AppID` `AppSecret`

| 名称 | 描述 | 备注 |
| --- | --- | --- |
| AppID | 机器人 ID | 必须使用 |
| AppSecret | 机器人密钥 | 用于在 `oauth` 场景进行请求签名的密钥 |
| Token(已弃用) | 机器人 Token | 可用于调用开放接口的鉴权。 |

Token 的鉴权方式已废弃，请使用更安全的 `Access Token` 鉴权方式。

开发过程中如遇任何问题，可联系 QQ 机器人反馈助手反馈。

## SDK DEMO

快速搭建机器人服务端可参考以下 SDK DEMO。（SDK 仅提供接入参考，详情能力以官方文档能力描述为准）

Go: botgo(opens new window)

Python: botpy(opens new window)

NodeJs: bot-node-sdk(opens new window)
