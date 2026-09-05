/**
 * QYbot 插件类型声明（自动生成，请勿手改）
 *
 * 由 scripts/build-types.mjs 从 src/ 生成，入口类型为 PluginContext 与 MessageContext。
 *
 * 使用：
 *   import type { PluginContext, MessageContext } from '../../qybot.js';
 *
 * 重新生成：npm run build:types
 */

/// <reference types="node" />

export interface Logger {
    error(module: string, message: unknown, ...args: unknown[]): void;
    warn(module: string, message: unknown, ...args: unknown[]): void;
    info(module: string, message: unknown, ...args: unknown[]): void;
    debug(module: string, message: unknown, ...args: unknown[]): void;
    plugin(module: string, message: unknown, ...args: unknown[]): void;
}

export const logger: Logger;

export interface PluginManifest {
    /** 插件 API 版本，必须为 3 */
    api: 3;
    /** 插件名称 */
    name: string;
    /** 版本号 */
    version?: string | number;
    /** 入口文件（相对插件目录），缺省 './main' */
    entry?: string;
    /** 作者 */
    author?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
    method: HttpMethod;
    /** 以 / 开头的接口路径，如 `/v2/groups/{group_openid}/messages` */
    path: string;
    /** JSON 请求体 */
    body?: unknown;
    /** query 参数，值为 undefined 时会被忽略 */
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    /** 单次请求超时（毫秒），默认 15000 */
    timeout?: number;
    /** 是否自动重试（默认 true，网络错误 / 429 / 5xx 时退避重试） */
    retry?: boolean;
}

export interface RawResponse {
    status: number;
    headers: Headers;
    text: string;
    json: <T = unknown>() => T;
}

export class ApiClient {
    private readonly tokenProvider;
    private readonly baseUrl;
    private readonly defaultTimeout;
    private readonly maxRetries;
    constructor(options: {
        tokenProvider: (force?: boolean) => Promise<string>;
        baseUrl?: string;
        defaultTimeout?: number;
        maxRetries?: number;
    });
    /** 发起请求并解析业务数据 */
    request<T = unknown>(options: RequestOptions): Promise<T>;
    /** 返回原始响应（用于下载等非 JSON 场景） */
    requestRaw(options: RequestOptions): Promise<RawResponse>;
    get<T = unknown>(path: string, query?: RequestOptions['query']): Promise<T>;
    post<T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T>;
    put<T = unknown>(path: string, body?: unknown, query?: RequestOptions['query']): Promise<T>;
    patch<T = unknown>(path: string, body?: unknown): Promise<T>;
    delete<T = unknown>(path: string, body?: unknown): Promise<T>;
    private isAuthFailure;
    private readErrCode;
    private parseJson;
}

export class TokenManager {
    private token;
    private expiresAt;
    private refreshing;
    private readonly options;
    constructor(options?: {
        appId?: string;
        clientSecret?: string;
        baseUrl?: string;
        refreshAdvanceMs?: number;
    });
    /** 提前刷新窗口（毫秒），默认 5 分钟 */
    private get refreshAdvanceMs();
    /** 获取可用的 access_token（到期前提前刷新） */
    get(force?: boolean): Promise<string>;
    /** 强制刷新并返回新 token */
    refresh(): Promise<string>;
    /** 当前 token 是否已获取（不触发刷新） */
    hasToken(): boolean;
    private parse;
}

export type MediaScene = 'group' | 'user';

export interface UploadResult {
    file_uuid?: string;
    /** 透传给发送接口 media.file_info，有有效期（ttl） */
    file_info?: string;
    ttl?: number;
    /** srv_send_msg=true 时返回的消息 ID */
    id?: string;
    /** 分片合并且为图片/视频/语音时的下载地址 */
    raw_url?: string;
}

export class MediaApi {
    private readonly client;
    constructor(client: ApiClient);
    /** URL 直传：平台下载转存 */
    uploadByUrl(scene: MediaScene, targetId: string, options: {
        url: string;
        fileType?: number;
        fileName?: string;
        /** true=直接发送并占用主动消息频次 */
        srvSendMsg?: boolean;
    }): Promise<UploadResult>;
    /**
     * 分片上传本地 Buffer（图片/视频/语音/文件）
     * @param scene 群聊或单聊
     * @param targetId group_openid 或 user_openid
     * @param data 文件二进制内容
     */
    uploadBuffer(scene: MediaScene, targetId: string, data: Buffer, options?: {
        fileType?: number;
        fileName?: string;
        concurrency?: number;
    }): Promise<UploadResult>;
    /** 上传图片的便捷方法 */
    uploadImage(scene: MediaScene, targetId: string, data: Buffer, fileName?: string): Promise<UploadResult>;
    /**
     * 场景路径（值为 group_openid / user_openid）
     * 注：官方把预上传接口的路径参数命名为 group_id / user_id，但与此处是同一个值。
     */
    private scopePath;
}

export interface MessageTarget {
    /** group=群聊, user=单聊(C2C) */
    scene: 'group' | 'user';
    /** group_openid / user_openid */
    id: string;
}

export interface MarkdownPayload {
    /** 自定义 markdown 文本 */
    content?: string;
    /** 平台申请的模板 ID */
    custom_template_id?: string;
    /** 模板变量填充：{ key, values } */
    params?: Array<{
        key: string;
        values: string[];
    }>;
    /** 图片资源转存失败时中断发送（默认 false） */
    force_verify_image_resource?: boolean;
}

export interface ButtonRenderData {
    label: string;
    visited_label: string;
    /** 0=灰色线框, 1=蓝色线框, 3=白底红字, 4=蓝底白字 */
    style?: number;
}

export interface ButtonPermission {
    /** 0=指定用户, 1=仅管理者, 2=所有人, 3=指定身份组（仅频道） */
    type: number;
    specify_role_ids?: string[];
    specify_user_ids?: string[];
}

export interface ButtonModal {
    /** 提示文本，最多 40 字符，不能含 URL */
    content: string;
    /** 确认按钮文字，最多 4 字符，默认“确认” */
    confirm_text?: string;
    /** 取消按钮文字，最多 4 字符，默认“取消” */
    cancel_text?: string;
}

export interface ButtonAction {
    /** 0=跳转按钮, 1=回调按钮, 2=指令按钮 */
    type: number;
    permission: ButtonPermission;
    /** 操作相关数据（回调时通过 button_data 回传 / 指令按钮插入输入框） */
    data: string;
    /** 指令按钮：是否带引用回复本消息 */
    reply?: boolean;
    /** 指令按钮：点击后自动发送 */
    enter?: boolean;
    /** 指令按钮：设为 1 时唤起手 Q 选图器（会忽略 enter） */
    anchor?: number;
    /** 点击二次确认 */
    modal?: ButtonModal;
    /** 客户端不支持时的提示文案 */
    unsupport_tips?: string;
}

export interface Button {
    id?: string;
    render_data: ButtonRenderData;
    action: ButtonAction;
    /** 分组 ID：同一分组内一个按钮操作后，其余按钮变灰（仅 action.type=1 有效） */
    group_id?: string;
}

export interface Keyboard {
    /** 平台申请通过的按钮模板 ID */
    id?: string;
    content?: {
        rows: Array<{
            buttons: Button[];
        }>;
    };
}

export interface MediaPayload {
    file_info: string;
}

export interface OutgoingMessage {
    /** 文本内容（msg_type=0） */
    text?: string;
    /**
     * Markdown：字符串或 { content } / { custom_template_id, params }（msg_type=2）
     * 与 text 同时存在时优先发送 Markdown，text 会被忽略（平台要求二者互斥）。
     */
    markdown?: string | MarkdownPayload;
    /** 图片：Buffer（自动分片上传）或公网 URL（msg_type=7） */
    image?: Buffer | string;
    /** 消息按钮，可与 markdown / text 组合 */
    keyboard?: Keyboard;
    /** 已上传好的富媒体 file_info（优先级高于 image，file_info 为空视为无效） */
    media?: MediaPayload;
    /** 引用回复：回复指定消息 ID（内容拆成多条时只挂在最后一条） */
    replyTo?: string;
    /** 被动回复序号：不填由框架自动维护；拆条发送时后续各条自动递增 */
    msgSeq?: number;
    /**
     * 互动召回消息：仅单聊主动消息有效，与 msgId/eventId 互斥。
     * 被动回复携带 msgId/eventId 时会被忽略并告警。
     */
    wakeup?: boolean;
    /** markdown 图片资源转存失败时中断发送（默认 false） */
    forceVerifyImageResource?: boolean;
}

export type MessageContent = string | OutgoingMessage | null | undefined | void;

export interface SendOptions {
    /** 回复的消息 ID（被动消息） */
    msgId?: string;
    /** 响应的事件 ID（事件被动消息） */
    eventId?: string;
    /** 递增序号（拆条发送时后续各条自动递增） */
    seq?: number;
    /** 互动召回消息（仅单聊主动消息，与 msgId/eventId 互斥） */
    wakeup?: boolean;
}

export interface SentMessage {
    id?: string;
    timestamp?: string;
    [key: string]: unknown;
}

export interface StreamChunk {
    /** 首次不传，后续传上一次返回的 id */
    streamMsgId?: string;
    index: number;
    content: string;
    contentType?: 'text' | 'markdown';
    /** 1=生成中, 10=生成结束 */
    inputState?: number;
    /** append=追加, replace=全量替换 */
    inputMode?: 'append' | 'replace';
    msgId?: string;
    eventId?: string;
    seq?: number;
    wakeup?: boolean;
}

export interface StreamResult {
    id?: string;
    timestamp?: string;
    ext_info?: {
        ref_idx?: string;
    };
    remain_msg_len?: number;
}

export class MessageApi {
    private readonly client;
    private readonly media;
    constructor(client: ApiClient, media: MediaApi);
    /** 发送消息（内容含图片时可能拆成多条） */
    send(target: MessageTarget, content: MessageContent, options?: SendOptions): Promise<SentMessage[]>;
    /** 撤回群聊消息（2 分钟内） */
    recallGroup(groupOpenid: string, messageId: string): Promise<void>;
    /** 撤回单聊消息（2 分钟内） */
    recallUser(userOpenid: string, messageId: string): Promise<void>;
    /** 发送单聊「输入中」状态 */
    sendTyping(userOpenid: string, seconds?: number, options?: {
        msgId?: string;
        eventId?: string;
        seq?: number;
    }): Promise<SentMessage>;
    /** 流式发送单聊消息（首片不传 streamMsgId） */
    sendStream(userOpenid: string, chunk: StreamChunk): Promise<StreamResult>;
    /** 回应互动事件（type=11 按钮 / type=12 快捷菜单必须回应） */
    respondInteraction(interactionId: string, code?: number): Promise<void>;
    /** 将插件返回的内容转换为一个或多个 API 请求体 */
    private buildPayloads;
    /** 归一化插件返回内容 */
    private normalize;
    /** 构造 msg_id / event_id / msg_seq / is_wakeup 等公共字段 */
    private buildCommonFields;
    private buildMarkdown;
    private pathOf;
}

export interface GroupInfo {
    group_openid?: string;
    group_name?: string;
    group_finger_memo?: string;
    group_class_text?: string;
    group_tags?: string[];
    group_member_num?: number;
}

export interface GroupBotState {
    member_openid?: string;
    joined_at?: string;
    /** 是否接收主动推送 */
    allow_proactive_msg?: boolean;
    /** all / only_mention / mention_and_context */
    recv_msg_setting?: string;
    /** member / owner / admin */
    member_role?: string;
}

export interface Paged<T> {
    items: T[];
    nextCursor?: string;
}

export interface GroupMember {
    member_openid?: string;
    username?: string;
    member_role?: string;
    bot?: boolean;
    joined_at?: string;
    union_openid?: string;
}

export interface BlacklistUser {
    union_openid?: string;
    member_openid?: string;
    username?: string;
    banned_at?: string;
    bot?: boolean;
}

export interface MuteSetting {
    global_rule?: {
        mode?: 'none' | 'always' | 'schedule';
        schedule_rules?: Array<{
            task_id?: string;
            start_at?: string;
            end_at?: string;
            enabled?: boolean;
        }>;
        recurring_rules?: Array<{
            task_id?: string;
            weekdays?: number[];
            start_time?: string;
            end_time?: string;
            enabled?: boolean;
        }>;
    };
    members?: Array<{
        member_openid?: string;
        mute_expire_at?: string;
        username?: string;
        union_openid?: string;
    }>;
}

export interface SetMemberMute {
    op: 'add' | 'update' | 'del';
    member_openid: string;
    /** RFC3339；op=del 时可传空串立即解除 */
    mute_expire_at?: string;
}

export interface JoinRequest {
    join_request_id?: string;
    risk_tips?: string;
    union_openid?: string;
    member_openid?: string;
    username?: string;
    apply_at?: string;
    apply_source?: string;
    invited_by?: string;
    bot?: boolean;
    verify_info?: {
        method?: string;
        verify_message?: string;
        review_qa_list?: Array<{
            question?: string;
            answer?: string;
        }>;
    };
}

export interface JoinApprovalStrategy {
    strategy_id?: string;
    group_openids?: string[];
    group_ids?: unknown[];
    whitelist_user_count?: number;
    is_enable?: string;
    expire_at?: string;
    created_at?: string;
    updated_at?: string;
    remark?: string;
}

export class GroupApi {
    private readonly client;
    constructor(client: ApiClient);
    /** 群基本信息 */
    info(groupOpenid: string): Promise<GroupInfo>;
    /** 机器人在群内的状态（含是否接收主动消息、全量消息开关） */
    botState(groupOpenid: string): Promise<GroupBotState>;
    /** 群成员列表（分页，每页最多 30） */
    members(groupOpenid: string, cursor?: string): Promise<Paged<GroupMember>>;
    /** 遍历全部群成员 */
    allMembers(groupOpenid: string, maxPages?: number): Promise<GroupMember[]>;
    /** 群成员详情 */
    member(groupOpenid: string, memberOpenid: string): Promise<GroupMember>;
    /** 批量移除群成员（单次最多 20） */
    removeMembers(groupOpenid: string, memberOpenids: string[], addToBlacklist?: boolean): Promise<{
        remove_members_result?: string;
        add_to_member_blacklist_fail_openids?: string[];
    }>;
    /** 群黑名单（目标用户不在群中时才能加入黑名单） */
    blacklist(groupOpenid: string, options?: {
        cursor?: string;
        limit?: number;
    }): Promise<Paged<BlacklistUser>>;
    /** 增删群黑名单（单次最多 20） */
    editBlacklist(groupOpenid: string, op: 'add' | 'del', memberOpenids: string[]): Promise<{
        fail_openids?: string[];
    }>;
    /** 查询禁言状态 */
    muteSetting(groupOpenid: string): Promise<MuteSetting>;
    /** 设置成员禁言（需群管理员，单次最多 20，最长 30 天） */
    setMemberMute(groupOpenid: string, members: SetMemberMute[]): Promise<void>;
    /** 解除成员禁言 */
    unmuteMember(groupOpenid: string, memberOpenid: string): Promise<void>;
    /** 入群申请列表（需群管理员） */
    joinRequests(groupOpenid: string, options?: {
        cursor?: string;
        limit?: number;
    }): Promise<Paged<JoinRequest>>;
    /** 审批入群申请（需群管理员） */
    approveJoinRequest(groupOpenid: string, memberOpenid: string, options: {
        op: 'approve' | 'decline';
        joinRequestId?: string;
        rejectReason?: string;
        addToBlacklist?: boolean;
    }): Promise<void>;
    /** 创建入群自动审批策略（最多 20 个策略） */
    createStrategy(options: {
        groupOpenids?: string[];
        groupIds?: Array<string | number>;
        isEnable?: 'on' | 'off';
        expireAt?: string;
        remark?: string;
    }): Promise<{
        strategy_id?: string;
        is_enable?: string;
        expire_at?: string;
    }>;
    /** 查询生效中的自动审批策略 */
    strategies(options?: {
        cursor?: string;
        limit?: number;
    }): Promise<Paged<JoinApprovalStrategy>>;
    /** 修改自动审批策略 */
    updateStrategy(strategyId: string, options: {
        isEnable?: 'on' | 'off';
        expireAt?: string;
        remark?: string;
        groupAction?: {
            op: 'add' | 'del';
            groupOpenids?: string[];
            groupIds?: Array<string | number>;
        };
    }): Promise<{
        is_enable?: string;
        expire_at?: string;
    }>;
    /** 删除自动审批策略 */
    deleteStrategy(strategyId: string): Promise<void>;
    /** 全量扫描策略关联群的入群申请（异步，约 10 分钟） */
    executeStrategy(strategyId: string): Promise<void>;
    /** 批量增删策略白名单 QQ 号（单次最多 10000，上限 10W） */
    editStrategyWhitelist(strategyId: string, op: 'add' | 'del', users: string[]): Promise<{
        strategy_id?: string;
        whitelist_user_count?: number;
        updated_at?: string;
    }>;
}

export interface BotInfo {
    id?: string;
    username?: string;
    avatar?: string;
    bot?: boolean;
    union_openid?: string;
    union_user_account?: string;
    /** 分享链接（部分机器人返回） */
    share_url?: string;
    welcome_msg?: string;
}

export interface GuildSummary {
    id?: string;
    name?: string;
    icon?: string;
    owner_id?: string;
    owner?: boolean;
    joined_at?: string;
    member_count?: number;
    max_members?: number;
    description?: string;
}

export class BotApi {
    private readonly client;
    constructor(client: ApiClient);
    /** 获取机器人详情 */
    me(): Promise<BotInfo>;
    /** 获取机器人加入的频道列表 */
    guilds(options?: {
        before?: string;
        after?: string;
        limit?: number;
    }): Promise<GuildSummary[]>;
    /**
     * 生成机器人分享链接（用于邀请用户添加好友）
     * @param callbackData 用户通过链接添加时透传回开发者，最长 32 字符
     */
    generateUrlLink(callbackData?: string): Promise<string>;
}

export interface Guild {
    id?: string;
    name?: string;
    icon?: string;
    owner_id?: string;
    owner?: boolean;
    joined_at?: string;
    member_count?: number;
    max_members?: number;
    description?: string;
}

export interface Channel {
    id?: string;
    guild_id?: string;
    name?: string;
    /** 0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛 */
    type?: number;
    /** 文字子频道子类型：0=闲聊, 1=公告, 2=攻略, 3=开黑 */
    sub_type?: number;
    position?: number;
    parent_id?: string;
    /** 0=公开, 1=群主管理员可见, 2=群主管理员+指定成员 */
    private_type?: number;
    /** 0=无效, 1=所有人, 2=群主管理员+指定成员 */
    speak_permission?: number;
    application_id?: string;
    permissions?: string;
    owner_id?: string;
}

export class GuildApi {
    private readonly client;
    constructor(client: ApiClient);
    /** 频道详情 */
    get(guildId: string): Promise<Guild>;
    /** 子频道列表 */
    channels(guildId: string): Promise<Channel[]>;
    /** 子频道详情 */
    channel(channelId: string): Promise<Channel>;
    /** 创建子频道（需管理员，分组类型 position 需 >= 2） */
    createChannel(guildId: string, options: {
        name: string;
        type?: number;
        subType?: number;
        position?: number;
        parentId?: string;
        privateType?: number;
        privateUserIds?: string[];
        speakPermission?: number;
        applicationId?: string;
    }): Promise<Channel>;
    /** 修改子频道（仅可改 name/position/parent_id/private_type/speak_permission） */
    updateChannel(channelId: string, options: {
        name?: string;
        position?: number;
        parentId?: string;
        privateType?: number;
        speakPermission?: number;
    }): Promise<Channel>;
    /** 删除子频道（不可恢复） */
    deleteChannel(channelId: string): Promise<void>;
}

export type PanelScope = 'c2c' | 'group' | 'channel' | 'dm';

export interface PanelItem {
    /** 指令名或展示名，最多 14 字符 */
    name: string;
    /** 描述，最多 30 字符 */
    desc?: string;
    /** command=指令（点击填入输入框）, link=链接跳转 */
    type: 'command' | 'link';
    only_admin?: boolean;
    /** type=link 时的 https 地址 */
    link?: string;
}

export interface Panel {
    items: PanelItem[];
    /** 备注，不对用户展示，最多 255 字符 */
    remark?: string;
    version?: number;
}

export interface PanelRecord {
    panel_id?: string;
    scope?: string;
    target_type?: string;
    panel?: Panel;
    created_at?: string;
    updated_at?: string;
    version?: number;
    user_openids?: string[];
    group_openids?: string[];
}

export class PanelApi {
    private readonly client;
    constructor(client: ApiClient);
    /** 面板列表（必须传 scope） */
    list(scope: PanelScope, options?: {
        cursor?: string;
        limit?: number;
    }): Promise<{
        records: PanelRecord[];
        nextCursor?: string;
        isEnd?: boolean;
    }>;
    /** 创建面板（global 时 targetType=all；c2c/group 支持 specific） */
    create(options: {
        scope: PanelScope;
        panel: Panel;
        targetType?: 'all' | 'specific';
        userOpenids?: string[];
        groupOpenids?: string[];
    }): Promise<string>;
    /** 面板详情（含关联对象） */
    get(panelId: string): Promise<PanelRecord>;
    /** 修改面板内容（不影响已关联的用户/群） */
    update(panelId: string, panel: Panel): Promise<number | undefined>;
    /** 删除面板 */
    delete(panelId: string): Promise<void>;
    /** 增删面板关联对象（仅 c2c/group 场景） */
    editTarget(panelId: string, op: 'add' | 'del', ids: {
        userOpenids?: string[];
        groupOpenids?: string[];
    }): Promise<void>;
}

export interface MenuItem {
    name: string;
    /** switch / send_message / link / menu */
    type: 'switch' | 'send_message' | 'link' | 'menu';
    sub_menu_items?: Array<{
        name: string;
        type: 'send_message' | 'link';
        send_message?: string;
        link?: string;
    }>;
    send_message?: string;
    link?: string;
    switch?: {
        switch_id: string;
        default: boolean;
    };
}

export class MenuApi {
    private readonly client;
    constructor(client: ApiClient);
    /** 查询当前菜单 */
    get(): Promise<{
        version?: number;
        items: MenuItem[];
    }>;
    /** 覆盖式设置菜单（5 QPM） */
    set(items: MenuItem[]): Promise<number | undefined>;
}

export class QQApi {
    readonly client: ApiClient;
    /** 传入 TokenManager 实例时可用 api.token 手动刷新凭证 */
    readonly token: TokenManager | undefined;
    readonly message: MessageApi;
    readonly media: MediaApi;
    readonly group: GroupApi;
    readonly bot: BotApi;
    readonly guild: GuildApi;
    readonly panel: PanelApi;
    readonly menu: MenuApi;
    constructor(tokenProvider: TokenManager | ((force?: boolean) => Promise<string>));
}

export interface MarkdownOptions {
    /** 允许 HTML 标签，默认 true */
    html?: boolean;
    /** 自动转换 URL 为链接，默认 true */
    linkify?: boolean;
    /** 启用印刷替换，默认 true */
    typographer?: boolean;
    /** markdown-it 插件列表 */
    plugins?: unknown[];
}

export interface Html2ImgOptions {
    /** 视口宽度，默认 450 */
    width?: number;
    /** 视口高度，默认 600 */
    height?: number;
    /** 图片质量（1-100，仅 jpeg），默认 90 */
    quality?: number;
    /** 图片格式，默认 png */
    type?: 'png' | 'jpeg';
    /** 是否截取整页，默认 true */
    fullPage?: boolean;
    /** 是否透明背景，默认 false */
    transparent?: boolean;
    /** 设备像素比，默认 2 */
    deviceScaleFactor?: number;
    /** 超时时间（毫秒），默认 30000 */
    timeout?: number;
    /** 渲染后额外等待时间（毫秒），默认 0 */
    waitFor?: number;
}

export interface Md2ImgOptions {
    mdOptions?: MarkdownOptions;
    imgOptions?: Html2ImgOptions;
}

export interface PluginUtils {
    /** Markdown -> HTML 字符串 */
    markdownToHTML: (markdownText: string, options?: MarkdownOptions) => string;
    image: {
        /** Markdown -> 图片 Buffer */
        withMarkdown: (markdownText: string, options?: Md2ImgOptions) => Promise<Buffer>;
        /** HTML -> 图片 Buffer */
        withHTML: (htmlContent: string, options?: Html2ImgOptions) => Promise<Buffer>;
    };
}

export type MessageScope = 'at' | 'group' | 'c2c' | 'all';

export interface MessageFilter {
    /** 限定生效的群 OpenID（可多个，仅群消息有效） */
    groups?: string | string[];
    /** 正则匹配整条消息（每次匹配前复位，可安全使用 g 标志） */
    match?: RegExp;
    /** 前缀匹配（可多个，命中后 msg.text 为去掉前缀的内容） */
    prefix?: string | string[];
    /** 前缀是否忽略大小写，默认 false（不影响 match，请用正则的 i 标志） */
    ignoreCase?: boolean;
}

export interface MessageScene {
    /** 场景来源，default=默认聊天窗口 */
    source?: string;
    /** key=value 扩展数据：msg_idx / ref_msg_idx / auth_token */
    ext?: string[];
}

export interface MessageAttachment {
    url?: string;
    filename?: string;
    /** 图片宽度（非图片附件无此字段） */
    width?: number;
    /** 图片高度（非图片附件无此字段） */
    height?: number;
    /** 文件大小（字节） */
    size?: number;
    /** voice / image/jpeg / image/png / image/gif / video/mp4 / file */
    content_type?: string;
    /** 语音转换后的 WAV 地址 */
    voice_wav_url?: string;
    /** 语音 ASR 参考结果 */
    asr_refer_text?: string;
}

export interface GatewayUser {
    /** 用户唯一标识（OpenID） */
    id?: string;
    /** 昵称 */
    username?: string;
    /** 是否机器人 */
    bot?: boolean;
    /** 跨应用统一标识（需申请才返回） */
    union_openid?: string;
    /** 跨应用统一账号（需申请才返回） */
    union_user_account?: string;
    /** 单聊场景的用户 OpenID */
    user_openid?: string;
    /** 群聊场景的群成员 OpenID */
    member_openid?: string;
    /** 群内角色：member=普通成员, admin=管理员, owner=群主 */
    member_role?: 'member' | 'admin' | 'owner' | string;
}

export interface ArkData {
    prompt?: string;
    /** tuwen / feed / miniapp / map / contact_card / video_share / music_together */
    ark_type?: string;
    ark_name?: string;
    fields?: Record<string, unknown>;
}

export interface MsgElement {
    msg_idx?: string;
    author?: GatewayUser;
    /** 0=文本, 3=结构化卡片, 101=并行消息, 102=聊天记录, 103=引用消息 */
    message_type?: number;
    content?: string;
    attachments?: MessageAttachment[];
    ark_data?: ArkData;
    msg_elements?: MsgElement[];
}

export interface MessageEventData {
    /** 消息 ID，可用于被动回复与撤回 */
    id?: string;
    author?: GatewayUser;
    /** 消息文本内容（群聊 @ 消息已去除 @ 前缀） */
    content?: string;
    /** 群 OpenID（群聊场景） */
    group_openid?: string;
    /** 消息发送时间，RFC3339 */
    timestamp?: string;
    message_type?: number;
    message_scene?: MessageScene;
    attachments?: MessageAttachment[];
    /** 消息中 @ 的用户列表（不含机器人自身） */
    mentions?: GatewayUser[];
    ark_data?: ArkData;
    msg_elements?: MsgElement[];
}

export interface MessageContext {
    /** 触发的事件名：GROUP_AT_MESSAGE_CREATE / GROUP_MESSAGE_CREATE / C2C_MESSAGE_CREATE */
    event: string;
    /** 消息全文（群聊 @ 消息已去除 @ 前缀） */
    content: string;
    /** 有效文本：prefix 模式下为去掉前缀后的内容，其余情况等于 content */
    text: string;
    /** 正则匹配结果（使用 match 注册时） */
    match?: RegExpMatchArray;
    /** 命中的前缀（使用 prefix 注册时） */
    prefix?: string;
    /** 消息 ID，用于被动回复与撤回 */
    messageId?: string;
    /** 事件最外层 ID，用于事件被动回复 */
    eventId?: string;
    /** 群 OpenID（群聊） */
    groupOpenid?: string;
    /** 发送者标识：群聊为 member_openid，单聊为 user_openid */
    senderId: string;
    /** 单聊用户 OpenID */
    userOpenid?: string;
    /** 群成员 OpenID */
    memberOpenid?: string;
    /** 发送者昵称 */
    nickname?: string;
    /** 群内角色：member / admin / owner */
    memberRole?: string;
    isGroup: boolean;
    isPrivate: boolean;
    timestamp?: string;
    /** 消息内容类型：0=文本, 3=结构化卡片, 101=并行, 102=聊天记录, 103=引用 */
    messageType?: number;
    messageScene?: MessageScene;
    attachments?: MessageAttachment[];
    mentions?: GatewayUser[];
    arkData?: ArkData;
    msgElements?: MsgElement[];
    /** 原始事件数据 */
    raw: MessageEventData;
    /**
     * 回复本条消息（被动消息，框架自动维护 msg_seq）。
     * 同一条消息的被动回复次数超限后，会自动降级为主动消息发出。
     */
    reply: (content: MessageContent) => Promise<SentMessage[]>;
    /** 发送主动消息到当前会话（群聊发群、单聊发用户） */
    send: (content: MessageContent) => Promise<SentMessage[]>;
    /** OpenAPI 客户端 */
    api: QQApi;
    logger: Logger;
}

export type MessageHandler = (msg: MessageContext) => MessageContent | Promise<MessageContent>;

export interface MessageHandlerOptions extends MessageFilter {
    /**
     * 处理函数：返回内容即自动回复，返回 null/undefined/空串则不回复。
     * 若在函数内已手动 reply/send，请返回 null，避免自动回复造成重复发送。
     */
    handler: MessageHandler;
}

export interface EventContext {
    /** 事件名，如 GROUP_ADD_ROBOT / FRIEND_ADD */
    event: string;
    /** 事件最外层 ID，可用于被动回复 */
    eventId?: string;
    /** 事件数据 */
    data: unknown;
    timestamp?: string | number;
    /** 响应事件（仅部分事件支持，如 GROUP_ADD_ROBOT / FRIEND_ADD / C2C_MSG_RECEIVE） */
    reply?: (content: MessageContent) => Promise<SentMessage[]>;
    api: QQApi;
    logger: Logger;
}

export type EventHandler = (event: EventContext) => MessageContent | void | Promise<MessageContent | void>;

export interface InteractionResolved {
    button_data?: string;
    button_id?: string;
    user_id?: string;
    feature_id?: string;
    message_id?: string;
    /** LIKE / UNLIKE（type=13） */
    feedback_opt?: string;
    checked?: number;
    action?: string;
    message_scene?: {
        ext?: string[];
    };
    authorize_data?: {
        opt_scene?: string;
        scope?: string;
    };
}

export interface InteractionEventData {
    /** 互动 ID，需用于 PUT /interactions/{id} 回应 */
    id?: string;
    /** 11=按钮回调, 12=快捷菜单, 13=消息反馈, 14=清空会话, 15=故事集, 16=切换模型, 18/19/20=授权 */
    type?: number;
    /** c2c / group / guild */
    scene?: string;
    /** 0=频道, 1=群聊, 2=单聊 */
    chat_type?: number;
    timestamp?: string;
    guild_id?: string;
    channel_id?: string;
    user_openid?: string;
    group_openid?: string;
    group_member_openid?: string;
    data?: {
        type?: number;
        resolved?: InteractionResolved;
    };
    version?: number;
    application_id?: string;
}

export interface InteractionContext {
    /** interaction_id，用于 ctx.api.message.respondInteraction */
    id: string;
    /** 11=按钮回调, 12=快捷菜单, 13=消息反馈, ... */
    type?: number;
    /** c2c / group / guild */
    scene?: string;
    /** 0=频道, 1=群聊, 2=单聊 */
    chatType?: number;
    /** 按钮 action.data */
    buttonData?: string;
    buttonId?: string;
    /** 操作的消息 ID */
    messageId?: string;
    groupOpenid?: string;
    userOpenid?: string;
    memberOpenid?: string;
    guildId?: string;
    channelId?: string;
    timestamp?: string;
    /** 事件最外层 ID，用于被动回复 */
    eventId?: string;
    /** 原始事件数据 */
    raw: InteractionEventData;
    /** 回应互动（type=11/12 必须回应，否则客户端一直 loading） */
    respond: (code?: number) => Promise<void>;
    /** 用事件 ID 被动回复消息 */
    reply: (content: MessageContent) => Promise<SentMessage[]>;
    api: QQApi;
    logger: Logger;
}

export type InteractionHandler = (interaction: InteractionContext) => MessageContent | void | Promise<MessageContent | void>;

export interface InteractionHandlerOptions {
    /** 只处理指定 type（如 11=按钮回调），不填则接收全部互动事件 */
    type?: number | number[];
    /** 处理函数 */
    handler: InteractionHandler;
}

export type UnloadCallback = () => void | Promise<void>;

export interface PluginContext {
    /** 日志器 */
    logger: Logger;
    /** 插件声明内容 */
    manifest: PluginManifest;
    /** 插件目录绝对路径 */
    dir: string;
    /**
     * OpenAPI 门面：
     * ctx.api.message / media / group / bot / guild / panel / menu
     */
    api: QQApi;
    /** 图片与 Markdown 工具集 */
    util: PluginUtils;
    /**
     * 注册消息处理器
     * @param scope 'at'=群内@机器人 / 'group'=群全量消息（需平台开启「接收所有消息」）/ 'c2c'=单聊 / 'all'=全部
     */
    onMessage: (scope: MessageScope, options: MessageHandlerOptions) => void;
    /** 注册任意网关事件处理器 */
    on: (event: string | string[], handler: EventHandler) => void;
    /** 注册互动事件处理器（按钮回调等） */
    onInteraction: (options: InteractionHandlerOptions) => void;
    /** 注册卸载回调 */
    onUnload: (callback: UnloadCallback) => void;
}
