import type { ApiClient } from './client.ts';

/** 机器人自身信息 */
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

/** 频道摘要 */
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

/** 机器人自身与通用能力 */
export class BotApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 获取机器人详情 */
  async me(): Promise<BotInfo> {
    return await this.client.get<BotInfo>('/users/@me');
  }

  /** 获取机器人加入的频道列表 */
  async guilds(options: { before?: string; after?: string; limit?: number } = {}): Promise<GuildSummary[]> {
    const data = await this.client.get<{ guilds?: GuildSummary[] }>('/users/@me/guilds', {
      before: options.before,
      after: options.after,
      limit: options.limit,
    });
    return data.guilds ?? [];
  }

  /**
   * 生成机器人分享链接（用于邀请用户添加好友）
   * @param callbackData 用户通过链接添加时透传回开发者，最长 32 字符
   */
  async generateUrlLink(callbackData?: string): Promise<string> {
    const data = await this.client.post<{ url_link?: string }>('/v2/generate_url_link', {
      ...(callbackData ? { callback_data: callbackData } : {}),
    });
    if (!data?.url_link) throw new Error('生成分享链接失败');
    return data.url_link;
  }
}
