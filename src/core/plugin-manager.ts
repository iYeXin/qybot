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
import { join } from 'node:path';
import type { QQApi } from '../api/index.ts';
import { createPluginContext } from './context.ts';
import { logger } from './logger.ts';
import { PLUGINS_DIR } from './paths.ts';
import {
  importFresh,
  pickInitExport,
  readManifest,
  registerPluginModuleHooks,
  resolvePluginEntry,
} from './plugin-loader.ts';
import type { HandlerRegistry } from './registry.ts';

/** 需要忽略的目录 */
const IGNORED_DIRS = new Set(['node_modules', '.git']);

/**
 * 插件管理器
 *
 * 插件一律为 ESM（.ts / .mts / .mjs / .js），入口导出 init(ctx)，
 * 通过 ctx 注册消息/事件处理器。不再支持旧版 processingTypes 与 CommonJS 插件。
 */
export class PluginManager {
  private readonly registry: HandlerRegistry;
  private readonly api: QQApi;
  private readonly pluginDir: string;
  private watcher: FSWatcher | null = null;
  private reloadDebounce: NodeJS.Timeout | null = null;
  private isLoading = false;
  private loadedCount = 0;

  private readonly onReloaded?: () => void;

  constructor(
    registry: HandlerRegistry,
    api: QQApi,
    pluginDir: string = PLUGINS_DIR,
    options: { onReloaded?: () => void } = {}
  ) {
    this.registry = registry;
    this.api = api;
    this.pluginDir = pluginDir;
    this.onReloaded = options.onReloaded;
    registerPluginModuleHooks(this.pluginDir);
  }

  /** 已加载的插件数量 */
  get count(): number {
    return this.loadedCount;
  }

  /** 解压插件 ZIP 包（放入 plugins 目录即自动安装） */
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

          if (existsSync(targetDir)) {
            const backupDir = `${targetDir}_${Date.now()}`;
            logger.plugin('PLUGIN', `插件目录已存在, 备份到: ${backupDir}`);
            renameSync(targetDir, backupDir);
          }

          logger.plugin('PLUGIN', `解压到: ${targetDir}`);
          zip.extractAllTo(this.pluginDir, true);
          unlinkSync(zipPath);
          logger.plugin('PLUGIN', `已安装: ${pluginDirName}`);
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

      // 卸载旧插件：执行 onUnload 并清空处理器
      await this.cleanup();

      if (!existsSync(this.pluginDir)) mkdirSync(this.pluginDir, { recursive: true });

      const pluginDirs = readdirSync(this.pluginDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => !name.startsWith('.') && !IGNORED_DIRS.has(name));

      let loaded = 0;

      for (const dir of pluginDirs) {
        const pluginDir = join(this.pluginDir, dir);
        const manifestPath = join(pluginDir, 'manifest.json');

        if (!existsSync(manifestPath)) {
          logger.warn('PLUGIN', `${dir} 缺少 manifest.json`);
          continue;
        }

        try {
          const manifest = readManifest(manifestPath);
          const entryFile = manifest.entry ?? './main';
          const entry = resolvePluginEntry(pluginDir, entryFile);

          if (!entry) {
            logger.warn('PLUGIN', `${manifest.name} 未找到入口文件 (${entryFile})`);
            continue;
          }

          const moduleNamespace = await importFresh(entry);
          const init = pickInitExport(moduleNamespace);

          if (!init) {
            logger.warn('PLUGIN', `${manifest.name} 未导出 init 函数`);
            continue;
          }

          const ctx = createPluginContext({
            manifest,
            dir: pluginDir,
            registry: this.registry,
            api: this.api,
          });

          await init(ctx);
          loaded++;
          logger.plugin('PLUGIN', `${manifest.name} 加载完成`);
        } catch (error) {
          logger.error('PLUGIN', `加载失败: ${dir}`, error);
        }
      }

      this.loadedCount = loaded;
      logger.info('PLUGIN', `插件加载完成，共加载 ${loaded}/${pluginDirs.length} 个插件`);
    } catch (error) {
      logger.error('PLUGIN', '插件加载失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /** 启动插件目录监听（热重载） */
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
      this.onReloaded?.();
    } catch (error) {
      logger.error('PLUGIN', '插件重载失败:', error);
    }
  }

  /** 执行卸载回调并清空处理器 */
  async cleanup(): Promise<void> {
    logger.info('PLUGIN', '清理插件资源...');
    await this.registry.runUnloadCallbacks();
    this.registry.clear();
    this.loadedCount = 0;
  }

  /** 停止目录监听 */
  stopWatching(): void {
    if (!this.watcher) return;
    this.watcher.close();
    this.watcher = null;
    logger.info('PLUGIN', '停止插件目录监听');
  }
}
