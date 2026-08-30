import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { dirname, extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PluginInstance, PluginManifest } from '../types/index.ts';

const require = createRequire(import.meta.url);

/** 入口文件候选后缀：.ts/.mts/.mjs 为 ESM，.js 为 CommonJS（兼容旧插件） */
const ENTRY_EXTENSIONS = ['.ts', '.mts', '.mjs', '.js'] as const;

let hooksRegistered = false;

/**
 * 注册同步 loader hook：强制 plugins 目录下的 .ts 文件按 ESM 解析。
 *
 * `plugins/package.json` 声明了 `"type": "commonjs"`（保证旧插件的 require 可用），
 * 因此 .ts 默认为 CommonJS。这里显式指定 `module-typescript`，
 * 既固定为 ESM，又保留类型剥离，使「新插件一律 ESM」在所有 Node 22.18+ 上行为一致。
 *
 * 失败时静默降级为 Node 默认行为（仅影响 TS 插件的模块类型判定）。
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
          // module-typescript：按 ESM 解析并执行类型剥离
          return nextLoad(url, { ...context, format: 'module-typescript' });
        }
        return nextLoad(url, context);
      },
    });
  } catch {
    // 忽略：当前 Node 版本不支持时回退到默认探测行为
  }
}

/** 判断值是否符合插件对象规范（拥有 main 方法） */
function isPluginLike(value: unknown): value is PluginInstance {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PluginInstance).main === 'function'
  );
}

/**
 * 从模块命名空间中取出插件对象
 * 兼容四种写法：
 *  - CommonJS:  module.exports = { name: plugin }
 *  - ESM 具名:  export const name = plugin
 *  - ESM 默认:  export default { name: plugin }
 *  - ESM 默认:  export default plugin
 */
export function pickPluginExport(
  moduleNamespace: unknown,
  name: string
): PluginInstance | null {
  const ns = (moduleNamespace ?? {}) as Record<string, unknown>;
  const defaultExport = ns.default as Record<string, unknown> | undefined;

  const candidates: unknown[] = [
    ns[name],
    defaultExport?.[name],
    defaultExport,
    ns['module.exports'],
  ];

  for (const candidate of candidates) {
    if (isPluginLike(candidate)) return candidate;
  }
  return null;
}

/**
 * 从模块命名空间中取出 api: 2 插件的 init 函数
 * 兼容写法：
 *  - ESM:  export function init(ctx) {} / export default function (ctx) {}
 *  - CJS:  module.exports = { init } / module.exports = function (ctx) {}
 */
export function pickInitExport(
  moduleNamespace: unknown
): ((ctx: unknown) => void | Promise<void>) | null {
  const ns = (moduleNamespace ?? {}) as Record<string, unknown>;
  const defaultExport = ns.default as unknown;

  const candidates: unknown[] = [
    ns.init,
    defaultExport,
    typeof defaultExport === 'object' && defaultExport !== null
      ? (defaultExport as Record<string, unknown>).init
      : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'function') return candidate as (ctx: unknown) => void | Promise<void>;
  }
  return null;
}

/**
 * 解析插件入口文件绝对路径
 * @param pluginDir 插件目录
 * @param mainExport manifest 中声明的主文件路径（可带或不带扩展名）
 */
export function resolvePluginEntry(pluginDir: string, mainExport: string): string | null {
  const base = resolve(pluginDir, mainExport);

  // 已显式声明扩展名
  if (extname(base)) {
    return existsSync(base) && statSync(base).isFile() ? base : null;
  }

  // 未声明扩展名：按 新插件(ESM) -> 旧插件(CJS) 的顺序探测
  for (const extension of ENTRY_EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** 清理指定目录下所有已被 CommonJS 加载器缓存的模块（含插件 require 的依赖与配置） */
function purgeRequireCache(dir: string): void {
  const target = resolve(dir).toLowerCase();
  const cache = require.cache as Record<string, { id: string } | undefined> | undefined;
  if (!cache) return;

  for (const key of Object.keys(cache)) {
    const file = key.toLowerCase();
    if (file === target || file.startsWith(target + sep)) {
      delete cache[key];
    }
  }
}

/**
 * 加载（或热重载）一个模块
 * - ESM：通过查询串绕过模块缓存
 * - CJS：清理 require.cache 后重新加载，插件内部 require 的依赖同样失效
 */
export async function importFresh<T = Record<string, unknown>>(filePath: string): Promise<T> {
  purgeRequireCache(dirname(filePath));
  const url = `${pathToFileURL(filePath).href}?v=${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const mod = await import(url);
  return mod as T;
}

/** 读取并解析插件声明文件 */
export function readManifest(manifestPath: string): PluginManifest {
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Partial<PluginManifest>;

  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new Error('manifest.json 缺少有效的 name 字段');
  }

  const api = manifest.api === 2 ? 2 : 1;

  // api: 2 插件通过 ctx.register 注册处理器，无需 processingTypes
  if (api === 1 && !Array.isArray(manifest.processingTypes)) {
    throw new Error('manifest.json 缺少有效的 processingTypes 字段');
  }

  // api: 2 用 entry，api: 1 用 mainExport（两者都兼容）
  const entryFile = manifest.entry ?? manifest.mainExport ?? './main';

  return {
    api,
    name: manifest.name,
    version: manifest.version ?? '0.0.0',
    entry: entryFile,
    mainExport: entryFile,
    author: manifest.author ?? manifest.auther,
    processingTypes: manifest.processingTypes ?? [],
  };
}
