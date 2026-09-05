import type { QQApi } from '../api/index.ts';
import { md2html } from '../image/markdown.ts';
import { html2img, md2img } from '../image/render.ts';
import type { HandlerRegistry } from './registry.ts';
import { logger } from './logger.ts';
import type {
  InteractionHandlerOptions,
  MessageHandlerOptions,
  MessageScope,
  PluginContext,
  PluginManifest,
  PluginUtils,
} from '../types/index.ts';

/** 插件可用工具集 */
export const pluginUtils: PluginUtils = {
  markdownToHTML: md2html,
  image: {
    withMarkdown: md2img,
    withHTML: html2img,
  },
};

/**
 * 创建插件上下文
 * 每个插件独享一份，注册与卸载回调都与该插件绑定
 */
export function createPluginContext(options: {
  manifest: PluginManifest;
  dir: string;
  registry: HandlerRegistry;
  api: QQApi;
}): PluginContext {
  const { manifest, dir, registry, api } = options;

  const onMessage = (scope: MessageScope, registration: MessageHandlerOptions): void => {
    registry.addMessage(scope, registration);
  };

  const onInteraction = (registration: InteractionHandlerOptions): void => {
    registry.addInteraction(registration);
  };

  return {
    logger,
    manifest,
    dir,
    api,
    util: pluginUtils,

    onMessage,
    on: (event, handler) => registry.addEvent(Array.isArray(event) ? event : [event], handler),
    onInteraction,
    onUnload: (callback) => registry.onUnload(callback),
  };
}
