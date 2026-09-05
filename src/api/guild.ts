import type { ApiClient } from './client.ts';

/** 频道详情 */
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

/** 子频道 */
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

/** 子频道类型枚举 */
export const ChannelType = {
  TEXT: 0,
  VOICE: 2,
  GROUP: 4,
  LIVE: 10005,
  APP: 10006,
  FORUM: 10007,
} as const;

/** 频道与子频道管理（部分接口需管理员且仅私域机器人可用） */
export class GuildApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 频道详情 */
  async get(guildId: string): Promise<Guild> {
    return await this.client.get<Guild>(`/guilds/${guildId}`);
  }

  /** 子频道列表 */
  async channels(guildId: string): Promise<Channel[]> {
    const data = await this.client.get<{ channels?: Channel[] }>(`/guilds/${guildId}/channels`);
    return data.channels ?? [];
  }

  /** 子频道详情 */
  async channel(channelId: string): Promise<Channel> {
    return await this.client.get<Channel>(`/channels/${channelId}`);
  }

  /** 创建子频道（需管理员，分组类型 position 需 >= 2） */
  async createChannel(
    guildId: string,
    options: {
      name: string;
      type?: number;
      subType?: number;
      position?: number;
      parentId?: string;
      privateType?: number;
      privateUserIds?: string[];
      speakPermission?: number;
      applicationId?: string;
    }
  ): Promise<Channel> {
    return await this.client.post<Channel>(`/guilds/${guildId}/channels`, {
      name: options.name,
      ...(options.type !== undefined ? { type: options.type } : {}),
      ...(options.subType !== undefined ? { sub_type: options.subType } : {}),
      ...(options.position !== undefined ? { position: options.position } : {}),
      ...(options.parentId ? { parent_id: options.parentId } : {}),
      ...(options.privateType !== undefined ? { private_type: options.privateType } : {}),
      ...(options.privateUserIds ? { private_user_ids: options.privateUserIds } : {}),
      ...(options.speakPermission !== undefined ? { speak_permission: options.speakPermission } : {}),
      ...(options.applicationId ? { application_id: options.applicationId } : {}),
    });
  }

  /** 修改子频道（仅可改 name/position/parent_id/private_type/speak_permission） */
  async updateChannel(
    channelId: string,
    options: {
      name?: string;
      position?: number;
      parentId?: string;
      privateType?: number;
      speakPermission?: number;
    }
  ): Promise<Channel> {
    return await this.client.patch<Channel>(`/channels/${channelId}`, {
      ...(options.name ? { name: options.name } : {}),
      ...(options.position !== undefined ? { position: options.position } : {}),
      ...(options.parentId ? { parent_id: options.parentId } : {}),
      ...(options.privateType !== undefined ? { private_type: options.privateType } : {}),
      ...(options.speakPermission !== undefined ? { speak_permission: options.speakPermission } : {}),
    });
  }

  /** 删除子频道（不可恢复） */
  async deleteChannel(channelId: string): Promise<void> {
    await this.client.delete(`/channels/${channelId}`);
  }
}
