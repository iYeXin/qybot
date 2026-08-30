import { md2html } from '../image/markdown.ts';
import { html2img, md2img } from '../image/render.ts';
import type { HandlerRegistry } from './registry.ts';
import { logger } from './logger.ts';
import type {
  HandlerRegistration,
  MessageScope,
  PluginContext,
  PluginContextV2,
  PluginManifest,
} from '../types/index.ts';

/** 创建 api: 1（旧版）插件的共享上下文 */
export function createPluginContextV1(): PluginContext {
  return {
    utils: { md2html, html2img, md2img },
    logger,
  };
}

/**
 * 创建 api: 2 插件的上下文
 * 每个插件独享一份，register / onUnload 均与该插件绑定
 */
export function createPluginContextV2(
  manifest: PluginManifest,
  dir: string,
  registry: HandlerRegistry
): PluginContextV2 {
  const register = (scope: MessageScope, registration: HandlerRegistration): void => {
    registry.add(scope, registration);
  };

  return {
    api: 2,
    util: {
      markdownToHTML: md2html,
      image: {
        withMarkdown: md2img,
        withHTML: html2img,
      },
    },
    logger,
    manifest,
    dir,
    register,
    onGroup: (registration) => register('group', registration),
    onPrivate: (registration) => register('private', registration),
    onUnload: (callback) => registry.onUnload(callback),
  };
}
