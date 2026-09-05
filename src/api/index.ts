import { ApiClient } from './client.ts';
import { BotApi } from './bot.ts';
import { GroupApi } from './group.ts';
import { GuildApi } from './guild.ts';
import { MediaApi } from './media.ts';
import { MessageApi } from './message.ts';
import { MenuApi, PanelApi } from './panel.ts';
import { TokenManager } from './token.ts';

export { ApiClient, httpFetch } from './client.ts';
export { QQApiError, describeGatewayError } from './errors.ts';
export { TokenManager } from './token.ts';
export { MessageApi, InteractionCode } from './message.ts';
export type { MessageTarget, SendOptions, StreamChunk, StreamResult } from './message.ts';
export { MediaApi } from './media.ts';
export { GroupApi } from './group.ts';
export { GuildApi } from './guild.ts';
export { BotApi } from './bot.ts';
export { MenuApi, PanelApi } from './panel.ts';

/**
 * OpenAPI 门面
 *
 * 插件可通过 ctx.api 访问全部开放接口：
 * ctx.api.message / media / group / bot / guild / panel / menu
 * 未封装的接口可用 ctx.api.client.request() 直接调用
 */
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

  constructor(tokenProvider: TokenManager | ((force?: boolean) => Promise<string>)) {
    const provider =
      typeof tokenProvider === 'function'
        ? tokenProvider
        : (force?: boolean): Promise<string> => tokenProvider.get(force);

    this.token = typeof tokenProvider === 'function' ? undefined : tokenProvider;
    this.client = new ApiClient({ tokenProvider: provider });
    this.media = new MediaApi(this.client);
    this.message = new MessageApi(this.client, this.media);
    this.group = new GroupApi(this.client);
    this.bot = new BotApi(this.client);
    this.guild = new GuildApi(this.client);
    this.panel = new PanelApi(this.client);
    this.menu = new MenuApi(this.client);
  }
}
