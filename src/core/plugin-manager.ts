import AdmZip from 'adm-zip';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  watch,
  type FSWatcher,
} from 'node:fs';
import { extname, join } from 'node:path';
import { PLUGINS_DIR } from './paths.ts';
import { logger } from './logger.ts';
import { createPluginContextV2 } from './context.ts';
import { HandlerRegistry } from './registry.ts';
import {
  importFresh,
  pickInitExport,
  pickPluginExport,
  readManifest,
  registerPluginModuleHooks,
  resolvePluginEntry,
} from './plugin-loader.ts';
import type {
  IncomingMessage,
  PluginContext,
  PluginInstance,
  PluginManifest,
  PluginResult,
} from '../types/index.ts';

/** 需要忽略的目录名（隐藏目录 / 依赖目录等） */
const IGNORED_DIRS = new Set(['node_modules', '.git']);

/** 判断入口文件是 ESM 还是 CommonJS（仅用于日志） */
function moduleFlavor(entry: string): string {
  return ['.mjs', '.mts', '.ts'].includes(extname(entry)) ? 'ESM' : 'CommonJS';
}

/** 插件管理器 */
export class PluginManager {
  private readonly plugins = new Map<string, PluginInstance>();
  private readonly registry = new HandlerRegistry();
  private readonly pluginDir: string;
  private readonly context: PluginContext;
  private defaultPlugin: PluginInstance | null = null;
  private watcher: FSWatcher | null = null;
  private reloadDebounce: NodeJS.Timeout | null = null;
  private isLoading = false;

  constructor(context: PluginContext, pluginDir: string = PLUGINS_DIR) {
    this.context = context;
    this.pluginDir = pluginDir;

    // 固定 plugins 目录下 .ts 文件的模块类型为 ESM
    registerPluginModuleHooks(this.pluginDir);
  }

  /** 解压插件 ZIP 包（放入 plugins 目录后自动安装） */
  private extractPlugins(): void {
    try {
      if (!existsSync(this.pluginDir)) {
        logger.info('PLUGIN', `创建插件目录: ${this.pluginDir}`);
        mkdirSync(this.pluginDir, { recursive: true });
        return;
      }

      const zipFiles = readdirSync(this.pluginDir).filter((file) => file.endsWith('.zip'));

      for (const zipFile of zipFiles) {
        const zipPath = join(this.pluginDir, zipFile);
        logger.plugin('PLUGIN', `发现ZIP插件包: ${zipFile}`);

        try {
          const zip = new AdmZip(zipPath);
          const topLevelDirs = new Set<string>();

          for (const entry of zip.getEntries()) {
            if (entry.isDirectory) continue;
            const parts = entry.entryName.split('/');
            if (parts.length > 1) topLevelDirs.add(parts[0]);
          }

          if (topLevelDirs.size !== 1) {
            logger.error('PLUGIN', `ZIP包结构无效: ${zipFile} - 应包含单个顶级目录`);
            continue;
          }

          const pluginDirName = [...topLevelDirs][0];
          const targetDir = join(this.pluginDir, pluginDirName);

          // 解压前备份已存在的插件
          if (existsSync(targetDir)) {
            const backupDir = `${targetDir}_${Date.now()}`;
            logger.plugin('PLUGIN', `插件目录已存在, 备份到: ${backupDir}`);
            renameSync(targetDir, backupDir);
          }

          logger.plugin('PLUGIN', `解压到: ${targetDir}`);
          zip.extractAllTo(this.pluginDir, true);

          unlinkSync(zipPath);
          logger.plugin('PLUGIN', `已删除ZIP文件: ${zipFile}`);
        } catch (error) {
          logger.error('PLUGIN', `解压失败: ${zipFile}`, error);
        }
      }
    } catch (error) {
      logger.error('PLUGIN', 'ZIP扫描失败:', error);
    }
  }

  /** 加载（或重新加载）全部插件 */
  async loadPlugins(): Promise<void> {
    if (this.isLoading) {
      logger.warn('PLUGIN', '插件加载正在进行中，跳过重复加载');
      return;
    }

    this.isLoading = true;
    logger.info('PLUGIN', '开始加载插件...');

    try {
      this.extractPlugins();

      await this.cleanup();
      this.plugins.clear();
      this.defaultPlugin = null;

      if (!existsSync(this.pluginDir)) {
        mkdirSync(this.pluginDir, { recursive: true });
        return;
      }

      const pluginDirs = readdirSync(this.pluginDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => !name.startsWith('.') && !IGNORED_DIRS.has(name));

      let loadedCount = 0;

      for (const dir of pluginDirs) {
        const pluginDir = join(this.pluginDir, dir);
        const manifestPath = join(pluginDir, 'manifest.json');

        if (!existsSync(manifestPath)) {
          logger.warn('PLUGIN', `${dir} 缺少 manifest.json`);
          continue;
        }

        try {
          const manifest = readManifest(manifestPath);
          const entryFile = manifest.entry ?? manifest.mainExport;
          const entry = resolvePluginEntry(pluginDir, entryFile);

          if (!entry) {
            logger.warn('PLUGIN', `${manifest.name} 未找到入口文件 (${entryFile})`);
            continue;
          }

          const moduleNamespace = await importFresh(entry);
          const loaded =
            manifest.api === 2
              ? await this.loadApi2Plugin(manifest, pluginDir, moduleNamespace)
              : await this.loadApi1Plugin(manifest, moduleNamespace);

          if (!loaded) continue;

          loadedCount++;
          logger.debug('PLUGIN', `${manifest.name} <- ${entry} (${moduleFlavor(entry)})`);
        } catch (error) {
          logger.error('PLUGIN', `加载失败: ${dir}`, error);
        }
      }

      logger.info('PLUGIN', `插件加载完成，共加载 ${loadedCount}/${pluginDirs.length} 个插件`);
    } catch (error) {
      logger.error('PLUGIN', '插件加载失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 加载 api: 1（旧版）插件
   * 插件导出与 manifest.name 同名的对象，通过 processingTypes 匹配消息
   */
  private async loadApi1Plugin(
    manifest: PluginManifest,
    moduleNamespace: unknown
  ): Promise<boolean> {
    const plugin = pickPluginExport(moduleNamespace, manifest.name);

    if (!plugin) {
      logger.warn('PLUGIN', `${manifest.name} 缺少 main 方法`);
      return false;
    }

    // 注入上下文到插件对象
    plugin.ctx = this.context;

    for (const type of manifest.processingTypes) {
      if (type === 'default') this.defaultPlugin = plugin;
      else this.plugins.set(type, plugin);
    }

    if (typeof plugin.init === 'function') {
      await plugin.init();
      logger.plugin('PLUGIN', `${manifest.name} 初始化完成`);
    }

    return true;
  }

  /**
   * 加载 api: 2 插件
   * 插件导出 init(ctx)，由插件自行通过 ctx.register 注册消息处理器
   */
  private async loadApi2Plugin(
    manifest: PluginManifest,
    pluginDir: string,
    moduleNamespace: unknown
  ): Promise<boolean> {
    const init = pickInitExport(moduleNamespace);

    if (!init) {
      logger.warn('PLUGIN', `${manifest.name} 未导出 init 函数 (api: 2 插件必需)`);
      return false;
    }

    const ctx = createPluginContextV2(manifest, pluginDir, this.registry);
    await init(ctx);
    logger.plugin('PLUGIN', `${manifest.name} 初始化完成 (api: 2)`);

    return true;
  }

  /** 启动插件目录监听（支持热重载） */
  startWatching(): void {
    if (this.watcher) return;

    logger.info('PLUGIN', `启动插件目录监听: ${this.pluginDir}`);

    this.watcher = watch(this.pluginDir, (eventType, filename) => {
      if (!filename) return;

      try {
        const filePath = join(this.pluginDir, filename);
        if (!existsSync(filePath)) return;

        const isDirectory = statSync(filePath).isDirectory();
        const isZip = filename.endsWith('.zip');

        if (!isDirectory && !isZip) return;

        logger.info('PLUGIN', `检测到插件变更: ${eventType} ${filename}`);

        if (this.reloadDebounce) clearTimeout(this.reloadDebounce);
        this.reloadDebounce = setTimeout(() => {
          void this.reloadPlugins();
        }, 1000);
      } catch (error) {
        logger.error('PLUGIN', `文件检测错误: ${filename}`, error);
      }
    });

    this.watcher.on('error', (error) => {
      logger.error('PLUGIN', '目录监听错误:', error);
    });
  }

  /** 重新加载插件 */
  async reloadPlugins(): Promise<void> {
    try {
      logger.info('PLUGIN', '开始重新加载插件...');
      await this.loadPlugins();
      logger.info('PLUGIN', '插件重载完成');
    } catch (error) {
      logger.error('PLUGIN', '插件重载失败:', error);
    }
  }

  /**
   * 分发消息
   * 1. 先交给 api: 2 插件注册的处理器
   * 2. 未命中时回退到 api: 1 插件（消息类型匹配 -> 默认插件）
   */
  async dispatchMessage(msg: IncomingMessage): Promise<PluginResult> {
    const v2Result = await this.registry.dispatch(msg);
    if (v2Result) return v2Result;

    const match = /^(\S+)([\s\S]*)$/.exec(msg.content);
    if (!match) return null;

    return await this.processMessage(match[1], (match[2] ?? '').trim(), msg.senderId, msg.isPrivate);
  }

  /** 按消息类型分发给插件处理（api: 1） */
  async processMessage(
    msgType: string,
    msgContent: string,
    senderOpenid: string,
    isPrivate: boolean
  ): Promise<PluginResult> {
    const plugin = this.plugins.get(msgType);

    if (plugin) {
      try {
        return await plugin.main(msgType, msgContent, senderOpenid, isPrivate);
      } catch (error) {
        logger.error('PLUGIN', `${msgType}处理失败:`, error);
        return '插件处理出错';
      }
    }

    if (this.defaultPlugin) {
      try {
        return await this.defaultPlugin.main(msgType, msgContent, senderOpenid, isPrivate);
      } catch (error) {
        logger.error('PLUGIN', '默认插件处理失败:', error);
      }
    }

    return null;
  }

  /** 执行 api: 2 插件的 onUnload 回调与 api: 1 插件的 cleanup 方法 */
  async cleanup(): Promise<void> {
    logger.info('PLUGIN', '清理插件资源...');

    // api: 2 插件的卸载回调
    await this.registry.runUnloadCallbacks();
    this.registry.clearHandlers();

    const cleanupOne = async (plugin: PluginInstance, name: string): Promise<void> => {
      if (typeof plugin.cleanup !== 'function') return;
      try {
        await plugin.cleanup();
        logger.debug('PLUGIN', `${name} 清理完成`);
      } catch (error) {
        logger.error('PLUGIN', `${name} 清理失败:`, error);
      }
    };

    // 同一插件对象可能注册了多个消息类型，去重后只清理一次
    const cleaned = new Set<PluginInstance>();

    for (const [type, plugin] of this.plugins) {
      if (cleaned.has(plugin)) continue;
      cleaned.add(plugin);
      await cleanupOne(plugin, type);
    }

    if (this.defaultPlugin && !cleaned.has(this.defaultPlugin)) {
      await cleanupOne(this.defaultPlugin, '默认插件');
    }
  }

  /** 停止目录监听 */
  stopWatching(): void {
    if (!this.watcher) return;
    this.watcher.close();
    this.watcher = null;
    logger.info('PLUGIN', '停止插件目录监听');
  }
}
