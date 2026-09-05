import type { ApiClient } from './client.ts';

/** 群信息 */
export interface GroupInfo {
  group_openid?: string;
  group_name?: string;
  group_finger_memo?: string;
  group_class_text?: string;
  group_tags?: string[];
  group_member_num?: number;
}

/** 机器人在群内的状态 */
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

/** 群成员 */
export interface GroupMember {
  member_openid?: string;
  username?: string;
  member_role?: string;
  bot?: boolean;
  joined_at?: string;
  union_openid?: string;
}

/** 黑名单用户 */
export interface BlacklistUser {
  union_openid?: string;
  member_openid?: string;
  username?: string;
  banned_at?: string;
  bot?: boolean;
}

/** 入群申请 */
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
    review_qa_list?: Array<{ question?: string; answer?: string }>;
  };
}

/** 禁言状态 */
export interface MuteSetting {
  global_rule?: {
    mode?: 'none' | 'always' | 'schedule';
    schedule_rules?: Array<{ task_id?: string; start_at?: string; end_at?: string; enabled?: boolean }>;
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

/** 设置禁言的条目 */
export interface SetMemberMute {
  op: 'add' | 'update' | 'del';
  member_openid: string;
  /** RFC3339；op=del 时可传空串立即解除 */
  mute_expire_at?: string;
}

/** 入群自动审批策略 */
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

/** 游标分页结果 */
export interface Paged<T> {
  items: T[];
  nextCursor?: string;
}

/**
 * 群管理接口
 *
 * 注意：成员列表 / 成员详情 / 批量移除 / 黑白名单为白名单 + 内邀能力（错误码 11253）；
 * 禁言与入群审批需要机器人具备群管理员身份。
 */
export class GroupApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 群基本信息 */
  async info(groupOpenid: string): Promise<GroupInfo> {
    return await this.client.get<GroupInfo>(`/v2/groups/${groupOpenid}/info`);
  }

  /** 机器人在群内的状态（含是否接收主动消息、全量消息开关） */
  async botState(groupOpenid: string): Promise<GroupBotState> {
    return await this.client.get<GroupBotState>(`/v2/groups/${groupOpenid}/bot_state`);
  }

  /** 群成员列表（分页，每页最多 30） */
  async members(groupOpenid: string, cursor?: string): Promise<Paged<GroupMember>> {
    const data = await this.client.get<{ members?: GroupMember[]; next_cursor?: string }>(
      `/v2/groups/${groupOpenid}/members`,
      { cursor }
    );
    return { items: data.members ?? [], nextCursor: data.next_cursor || undefined };
  }

  /** 遍历全部群成员 */
  async allMembers(groupOpenid: string, maxPages = 100): Promise<GroupMember[]> {
    const result: GroupMember[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const data = await this.members(groupOpenid, cursor);
      result.push(...data.items);
      if (!data.nextCursor) break;
      cursor = data.nextCursor;
    }
    return result;
  }

  /** 群成员详情 */
  async member(groupOpenid: string, memberOpenid: string): Promise<GroupMember> {
    return await this.client.get<GroupMember>(`/v2/groups/${groupOpenid}/members/${memberOpenid}`);
  }

  /** 批量移除群成员（单次最多 20） */
  async removeMembers(
    groupOpenid: string,
    memberOpenids: string[],
    addToBlacklist = false
  ): Promise<{ remove_members_result?: string; add_to_member_blacklist_fail_openids?: string[] }> {
    return await this.client.post(`/v2/groups/${groupOpenid}/batch_remove_members`, {
      member_openids: memberOpenids,
      add_to_member_blacklist: addToBlacklist,
    });
  }

  /** 群黑名单（目标用户不在群中时才能加入黑名单） */
  async blacklist(groupOpenid: string, options: { cursor?: string; limit?: number } = {}): Promise<Paged<BlacklistUser>> {
    const data = await this.client.get<{ users?: BlacklistUser[]; next_cursor?: string }>(
      `/v2/groups/${groupOpenid}/member_blacklist`,
      { cursor: options.cursor, limit: options.limit }
    );
    return { items: data.users ?? [], nextCursor: data.next_cursor || undefined };
  }

  /** 增删群黑名单（单次最多 20） */
  async editBlacklist(
    groupOpenid: string,
    op: 'add' | 'del',
    memberOpenids: string[]
  ): Promise<{ fail_openids?: string[] }> {
    return await this.client.post(`/v2/groups/${groupOpenid}/member_blacklist`, {
      op,
      member_openids: memberOpenids,
    });
  }

  /** 查询禁言状态 */
  async muteSetting(groupOpenid: string): Promise<MuteSetting> {
    return await this.client.get<MuteSetting>(`/v2/groups/${groupOpenid}/restrict_chat_setting`);
  }

  /** 设置成员禁言（需群管理员，单次最多 20，最长 30 天） */
  async setMemberMute(groupOpenid: string, members: SetMemberMute[]): Promise<void> {
    await this.client.post(`/v2/groups/${groupOpenid}/restrict_chat_setting`, { members });
  }

  /** 解除成员禁言 */
  async unmuteMember(groupOpenid: string, memberOpenid: string): Promise<void> {
    await this.setMemberMute(groupOpenid, [{ op: 'del', member_openid: memberOpenid, mute_expire_at: '' }]);
  }

  /** 入群申请列表（需群管理员） */
  async joinRequests(
    groupOpenid: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<Paged<JoinRequest>> {
    const data = await this.client.get<{ list?: JoinRequest[]; next_cursor?: string }>(
      `/v2/groups/${groupOpenid}/join_request_list`,
      { cursor: options.cursor, limit: options.limit }
    );
    return { items: data.list ?? [], nextCursor: data.next_cursor || undefined };
  }

  /** 审批入群申请（需群管理员） */
  async approveJoinRequest(
    groupOpenid: string,
    memberOpenid: string,
    options: {
      op: 'approve' | 'decline';
      joinRequestId?: string;
      rejectReason?: string;
      addToBlacklist?: boolean;
    }
  ): Promise<void> {
    await this.client.post(`/v2/groups/${groupOpenid}/approval_join_request/${memberOpenid}`, {
      op: options.op,
      ...(options.joinRequestId ? { join_request_id: options.joinRequestId } : {}),
      ...(options.rejectReason ? { reject_reason: options.rejectReason } : {}),
      ...(options.addToBlacklist !== undefined ? { add_to_member_blacklist: options.addToBlacklist } : {}),
    });
  }

  /** 创建入群自动审批策略（最多 20 个策略） */
  async createStrategy(options: {
    groupOpenids?: string[];
    groupIds?: Array<string | number>;
    isEnable?: 'on' | 'off';
    expireAt?: string;
    remark?: string;
  }): Promise<{ strategy_id?: string; is_enable?: string; expire_at?: string }> {
    return await this.client.post('/v2/groups/join_approval_strategy', {
      ...(options.groupOpenids ? { group_openids: options.groupOpenids } : {}),
      ...(options.groupIds ? { group_ids: options.groupIds } : {}),
      ...(options.isEnable ? { is_enable: options.isEnable } : {}),
      ...(options.expireAt ? { expire_at: options.expireAt } : {}),
      ...(options.remark ? { remark: options.remark } : {}),
    });
  }

  /** 查询生效中的自动审批策略 */
  async strategies(options: { cursor?: string; limit?: number } = {}): Promise<Paged<JoinApprovalStrategy>> {
    const data = await this.client.get<{ strategies?: JoinApprovalStrategy[]; next_cursor?: string }>(
      '/v2/groups/join_approval_strategy',
      { cursor: options.cursor, limit: options.limit }
    );
    return { items: data.strategies ?? [], nextCursor: data.next_cursor || undefined };
  }

  /** 修改自动审批策略 */
  async updateStrategy(
    strategyId: string,
    options: {
      isEnable?: 'on' | 'off';
      expireAt?: string;
      remark?: string;
      groupAction?: {
        op: 'add' | 'del';
        groupOpenids?: string[];
        groupIds?: Array<string | number>;
      };
    }
  ): Promise<{ is_enable?: string; expire_at?: string }> {
    return await this.client.patch(`/v2/groups/join_approval_strategy/${strategyId}`, {
      ...(options.isEnable ? { is_enable: options.isEnable } : {}),
      ...(options.expireAt ? { expire_at: options.expireAt } : {}),
      ...(options.remark ? { remark: options.remark } : {}),
      ...(options.groupAction
        ? {
            group_action: {
              op: options.groupAction.op,
              ...(options.groupAction.groupOpenids
                ? { group_openids: options.groupAction.groupOpenids }
                : {}),
              ...(options.groupAction.groupIds ? { group_ids: options.groupAction.groupIds } : {}),
            },
          }
        : {}),
    });
  }

  /** 删除自动审批策略 */
  async deleteStrategy(strategyId: string): Promise<void> {
    await this.client.delete(`/v2/groups/join_approval_strategy/${strategyId}`);
  }

  /** 全量扫描策略关联群的入群申请（异步，约 10 分钟） */
  async executeStrategy(strategyId: string): Promise<void> {
    await this.client.post(`/v2/groups/join_approval_strategy/${strategyId}/execute`);
  }

  /** 批量增删策略白名单 QQ 号（单次最多 10000，上限 10W） */
  async editStrategyWhitelist(
    strategyId: string,
    op: 'add' | 'del',
    users: string[]
  ): Promise<{ strategy_id?: string; whitelist_user_count?: number; updated_at?: string }> {
    return await this.client.post(`/v2/groups/join_approval_strategy/${strategyId}/whitelist_users`, {
      op,
      whitelist_users: users,
    });
  }
}
