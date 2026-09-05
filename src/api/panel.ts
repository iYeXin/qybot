import type { ApiClient } from './client.ts';

/** 指令面板生效场景 */
export type PanelScope = 'c2c' | 'group' | 'channel' | 'dm';

/** 面板元素 */
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

/** 面板内容（最多 20 个 item） */
export interface Panel {
  items: PanelItem[];
  /** 备注，不对用户展示，最多 255 字符 */
  remark?: string;
  version?: number;
}

/** 面板记录 */
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

/** 菜单项 */
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
  switch?: { switch_id: string; default: boolean };
}

/** 指令面板（一个机器人最多 20 个面板，每个面板最多 20 个元素） */
export class PanelApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 面板列表（必须传 scope） */
  async list(scope: PanelScope, options: { cursor?: string; limit?: number } = {}): Promise<{
    records: PanelRecord[];
    nextCursor?: string;
    isEnd?: boolean;
  }> {
    const data = await this.client.get<{
      records?: PanelRecord[];
      next_cursor?: string;
      is_end?: boolean;
    }>('/v2/panels', { scope, cursor: options.cursor, limit: options.limit });

    return { records: data.records ?? [], nextCursor: data.next_cursor || undefined, isEnd: data.is_end };
  }

  /** 创建面板（global 时 targetType=all；c2c/group 支持 specific） */
  async create(options: {
    scope: PanelScope;
    panel: Panel;
    targetType?: 'all' | 'specific';
    userOpenids?: string[];
    groupOpenids?: string[];
  }): Promise<string> {
    const data = await this.client.post<{ panel_id?: string }>('/v2/panels', {
      scope: options.scope,
      panel: options.panel,
      ...(options.targetType ? { target_type: options.targetType } : {}),
      ...(options.userOpenids ? { user_openids: options.userOpenids } : {}),
      ...(options.groupOpenids ? { group_openids: options.groupOpenids } : {}),
    });
    if (!data?.panel_id) throw new Error('创建指令面板失败');
    return data.panel_id;
  }

  /** 面板详情（含关联对象） */
  async get(panelId: string): Promise<PanelRecord> {
    return await this.client.get<PanelRecord>(`/v2/panels/${panelId}`);
  }

  /** 修改面板内容（不影响已关联的用户/群） */
  async update(panelId: string, panel: Panel): Promise<number | undefined> {
    const data = await this.client.put<{ version?: number }>(`/v2/panels/${panelId}`, { panel });
    return data?.version;
  }

  /** 删除面板 */
  async delete(panelId: string): Promise<void> {
    await this.client.delete(`/v2/panels/${panelId}`);
  }

  /** 增删面板关联对象（仅 c2c/group 场景） */
  async editTarget(
    panelId: string,
    op: 'add' | 'del',
    ids: { userOpenids?: string[]; groupOpenids?: string[] }
  ): Promise<void> {
    await this.client.put(`/v2/panels/${panelId}/target`, {
      op,
      ...(ids.userOpenids ? { user_openids: ids.userOpenids } : {}),
      ...(ids.groupOpenids ? { group_openids: ids.groupOpenids } : {}),
    });
  }
}

/** 自定义菜单（仅单聊场景，全局生效，最多 10 个一级项） */
export class MenuApi {
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /** 查询当前菜单 */
  async get(): Promise<{ version?: number; items: MenuItem[] }> {
    const data = await this.client.get<{ version?: number; menu?: { items?: MenuItem[] } }>('/v2/menu');
    return { version: data.version, items: data.menu?.items ?? [] };
  }

  /** 覆盖式设置菜单（5 QPM） */
  async set(items: MenuItem[]): Promise<number | undefined> {
    const data = await this.client.put<{ version?: number }>('/v2/menu', { menu: { items } });
    return data?.version;
  }
}
