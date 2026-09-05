import { existsSync, readFileSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PluginInit, PluginManifest } from '../types/index.ts';

/** 入口文件候选后缀（新插件一律 ESM） */
const ENTRY_EXTENSIONS = ['.ts', '.mts', '.mjs', '.js'] as const;

/** 当前插件 API 版本 */
export const PLUGIN_API_VERSION = 3;

let hooksRegistered = false;

/**
 * 固定 plugins 目录下 .ts 文件的模块类型为 ESM TypeScript。
 *
 * 插件目录已声明 `"type": "module"`，这里再显式指定 `module-typescript`，
 * 保证类型剥离生效、行为在所有 Node 22.18+ 上一致。失败时静默降级。
 */
export function registerPluginModuleHooks(pluginsDir: string): void {
  if (hooksRegistered) return;
  hooksRegistered = true;

  try {
    if (typeof registerHooks !== 'function') return;

    const pluginsUrl = pathToFileURL(resolve(pluginsDir) + sep).href;

    registerHooks({
      load(url, context, nextLoad) {
        // 热重载时 URL 带缓存查询串，比对前先去掉
        const pathname = url.split('?')[0] ?? url;
        if (pathname.startsWith(pluginsUrl) && pathname.endsWith('.ts')) {
          return nextLoad(url, { ...context, format: 'module-typescript' });
        }
        return nextLoad(url, context);
      },
    });
  } catch {
    // 忽略：不支持时回退到 Node 默认行为
  }
}

/**
 * 从模块命名空间中取出 init 函数
 * 支持：export function init(ctx) / export default function (ctx)
 */
export function pickInitExport(moduleNamespace: unknown): PluginInit | null {
  const ns = (moduleNamespace ?? {}) as Record<string, unknown>;
  const defaultExport = ns.default;

  const candidates: unknown[] = [
    ns.init,
    defaultExport,
    typeof defaultExport === 'object' && defaultExport !== null
      ? (defaultExport as Record<string, unknown>).init
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'function') return candidate as PluginInit;
  }
  return null;
}

/** 解析入口文件绝对路径 */
export function resolvePluginEntry(pluginDir: string, entry: string): string | null {
  const base = resolve(pluginDir, entry);

  if (extname(base)) {
    return existsSync(base) && statSync(base).isFile() ? base : null;
  }

  for (const extension of ENTRY_EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** 加载（或热重载）ESM 模块：查询串绕过模块缓存 */
export async function importFresh<T = Record<string, unknown>>(filePath: string): Promise<T> {
  const url = `${pathToFileURL(filePath).href}?v=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return (await import(url)) as T;
}

/** 读取并校验插件声明 */
export function readManifest(manifestPath: string): PluginManifest {
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Partial<PluginManifest>;

  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('manifest.json 缺少有效的 name 字段');
  }

  if (manifest.api === undefined) {
    throw new Error('manifest.json 缺少 api 字段（当前框架要求 "api": 3）');
  }
  if (manifest.api !== PLUGIN_API_VERSION) {
    throw new Error(
      `插件 API 版本不兼容：声明为 ${manifest.api}，当前框架要求 ${PLUGIN_API_VERSION}（插件需导出 init(ctx)，且必须是 ESM）`
    );
  }

  return {
    api: PLUGIN_API_VERSION,
    name: manifest.name,
    version: manifest.version ?? '0.0.0',
    entry: manifest.entry ?? './main',
    ...(manifest.author ? { author: manifest.author } : {}),
  };
}
