# 接口文档索引

## 接口

### 消息/单聊消息

- POST /v2/users/{user_openid}/messages — 发送单聊消息
- POST /v2/users/{user_openid}/stream_messages — 流式发送单聊消息
- DELETE /v2/users/{user_openid}/messages/{message_id} — 撤回单聊消息

### 消息/群消息

- DELETE /v2/groups/{group_openid}/messages/{message_id} — 撤回群聊消息
- POST /v2/groups/{group_openid}/messages — 发送群聊消息

### 消息/富媒体

- POST /v2/groups/{group_openid}/files — 群聊富媒体上传
- POST /v2/users/{user_openid}/files — 单聊富媒体上传
- POST /v2/groups/{group_id}/upload_part_finish — 群聊分片上传完成
- POST /v2/groups/{group_id}/upload_prepare — 群聊富媒体预上传
- POST /v2/users/{user_id}/upload_part_finish — 单聊分片上传完成
- POST /v2/users/{user_id}/upload_prepare — 单聊富媒体预上传

### 互动/自定义菜单

- GET /v2/menu — 查询全局自定义菜单
- PUT /v2/menu — 修改全局自定义菜单

### 互动/指令面板

- GET /v2/panels — 查询指令面板列表
- POST /v2/panels — 创建指令面板
- PUT /v2/panels/{panel_id}/target — 修改指令面板关联对象
- GET /v2/panels/{panel_id} — 查询指令面板详情
- PUT /v2/panels/{panel_id} — 修改指令面板
- DELETE /v2/panels/{panel_id} — 删除指令面板

### 互动/互动回调

- PUT /interactions/{interaction_id} — 互动事件响应

### QQ频道/频道管理

- GET /guilds/{guild_id} — 获取频道详情
- GET /guilds/{guild_id}/channels — 获取子频道列表
- POST /guilds/{guild_id}/channels — 创建子频道
- GET /channels/{channel_id} — 获取子频道详情
- PATCH /channels/{channel_id} — 修改子频道
- DELETE /channels/{channel_id} — 删除子频道

### 用户/机器人

- GET /users/@me — 获取机器人详情
- GET /users/@me/guilds — 获取机器人加入的频道列表

### 用户/网关

- GET /gateway — 获取通用 WSS 接入点

### 用户/机器人管理

- POST /v2/generate_url_link — 生成分享链接

### QQ群/群信息

- GET /v2/groups/{group_openid}/info — 获取群基本信息
- GET /v2/groups/{group_openid}/bot_state — 获取机器人群内状态

### QQ群/群成员

- GET /v2/groups/{group_openid}/members — 获取群成员列表
- GET /v2/groups/{group_openid}/members/{member_openid} — 获取群成员信息
- POST /v2/groups/{group_openid}/batch_remove_members — 群成员批量移除

### QQ群/入群申请

- GET /v2/groups/{group_openid}/join_request_list — 入群申请列表拉取
- POST /v2/groups/{group_openid}/approval_join_request/{member_openid} — 入群申请审批
- POST /v2/groups/join_approval_strategy — 创建入群自动审批策略
- PATCH /v2/groups/join_approval_strategy/{strategy_id} — 修改入群自动审批策略
- POST /v2/groups/join_approval_strategy/{strategy_id}/execute — 执行入群自动审批策略
- POST /v2/groups/join_approval_strategy/{strategy_id}/whitelist_users — 修改入群自动审批策略的白名单号码
- GET /v2/groups/join_approval_strategy — 查询入群自动审批策略列表
- DELETE /v2/groups/join_approval_strategy/{strategy_id} — 删除入群自动审批策略

### QQ群/群黑名单

- GET /v2/groups/{group_openid}/member_blacklist — 群黑名单查询
- POST /v2/groups/{group_openid}/member_blacklist — 群黑名单操作

### QQ群/群禁言

- GET /v2/groups/{group_openid}/restrict_chat_setting — 查询群禁言状态
- POST /v2/groups/{group_openid}/restrict_chat_setting — 设置群成员禁言

## 事件

### 通用/互动

- INTERACTION_CREATE — 互动事件

### 通用/订阅消息

- SUBSCRIBE_MESSAGE_STATUS — 订阅消息授权状态变更

### 好友/好友关系

- FRIEND_ADD — 用户添加好友
- FRIEND_DEL — 用户删除好友

### 消息/单聊消息

- C2C_MESSAGE_CREATE — 单聊消息事件

### 好友/消息接收开关

- C2C_MSG_RECEIVE — 单聊消息接收开启
- C2C_MSG_REJECT — 单聊消息接收关闭

### QQ群/机器人

- GROUP_ADD_ROBOT — 机器人加入群聊
- GROUP_DEL_ROBOT — 机器人退出群聊
- GROUP_JOIN_REQUEST — 用户申请加群事件

### QQ群/消息接收开关

- GROUP_MSG_RECEIVE — 群聊消息接收开启
- GROUP_MSG_REJECT — 群聊消息接收关闭

### 消息/群聊消息

- GROUP_AT_MESSAGE_CREATE — 群@机器人消息
- GROUP_MESSAGE_CREATE — 群消息（全量模式）

### QQ群/群成员

- GROUP_MEMBER_ADD — 群成员加入
- GROUP_MEMBER_REMOVE — 群成员退出

### QQ频道/频道管理

- GUILD_CREATE — 频道创建
- GUILD_UPDATE — 频道更新
- GUILD_DELETE — 频道解散
- CHANNEL_CREATE — 子频道创建
- CHANNEL_UPDATE — 子频道更新
- CHANNEL_DELETE — 子频道删除
