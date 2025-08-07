const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { getAccessToken, getWsLink, uploadImage, botSendMessage, botSendImageMessage, uploadImageForPrivate, sendPrivateMessage, sendPrivateImageMessage } = require('./api');
const img2Url = require('./image');
const AdmZip = require('adm-zip');
const { md2html, html2img, md2img } = require('./toImg');

// 日志工具函数
const logger = {
  colors: {
    reset: '\x1b[0m',
    error: '\x1b[31m', // 红色
    warn: '\x1b[33m',  // 黄色
    info: '\x1b[36m',  // 青色
    debug: '\x1b[32m', // 绿色
    plugin: '\x1b[35m' // 紫色
  },

  log(level, module, message, ...args) {
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0')
    ].join('-') + ' ' + [
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0')
    ].join(':');
    const color = this.colors[level] || this.colors.info;
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] [${module}]${this.colors.reset} ${message}`, ...args);
  },

  error(module, message, ...args) {
    this.log('error', module, message, ...args);
  },

  warn(module, message, ...args) {
    this.log('warn', module, message, ...args);
  },

  info(module, message, ...args) {
    this.log('info', module, message, ...args);
  },

  debug(module, message, ...args) {
    this.log('debug', module, message, ...args);
  },

  plugin(module, message, ...args) {
    this.log('plugin', module, message, ...args);
  }
};

// 创建插件上下文对象
const pluginContext = {
  utils: {
    md2html,
    html2img,
    md2img
  },
  logger
};

// === 插件管理器 ===
class PluginManager {
  constructor(ctx) {
    this.plugins = new Map();
    this.defaultPlugin = null;
    this.pluginDir = path.join(__dirname, 'plugins');
    this.context = ctx;
    this.watcher = null;
    this.reloadDebounce = null;
    this.isLoading = false;
  }

  // 解压插件ZIP包
  async extractPlugins() {
    try {
      if (!fs.existsSync(this.pluginDir)) {
        logger.info('PLUGIN', `创建插件目录: ${this.pluginDir}`);
        fs.mkdirSync(this.pluginDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(this.pluginDir);
      const zipFiles = files.filter(file => file.endsWith('.zip'));

      for (const zipFile of zipFiles) {
        const zipPath = path.join(this.pluginDir, zipFile);
        logger.plugin('PLUGIN', `发现ZIP插件包: ${zipFile}`);

        try {
          const zip = new AdmZip(zipPath);
          const entries = zip.getEntries();
          const topLevelDirs = new Set();

          entries.forEach(entry => {
            if (entry.isDirectory) return;
            const parts = entry.entryName.split('/');
            if (parts.length > 1) topLevelDirs.add(parts[0]);
          });

          if (topLevelDirs.size !== 1) {
            logger.error('PLUGIN', `ZIP包结构无效: ${zipFile} - 应包含单个顶级目录`);
            continue;
          }

          const pluginDirName = [...topLevelDirs][0];
          const targetDir = path.join(this.pluginDir, pluginDirName);

          // 解压前备份已存在的插件
          if (fs.existsSync(targetDir)) {
            const backupDir = `${targetDir}_${Date.now()}`;
            logger.plugin('PLUGIN', `插件目录已存在, 备份到: ${backupDir}`);
            fs.renameSync(targetDir, backupDir);
          }

          // 解压ZIP文件
          logger.plugin('PLUGIN', `解压到: ${targetDir}`);
          zip.extractAllTo(this.pluginDir, true);

          // 删除ZIP文件
          fs.unlinkSync(zipPath);
          logger.plugin('PLUGIN', `已删除ZIP文件: ${zipFile}`);

        } catch (e) {
          logger.error('PLUGIN', `解压失败: ${zipFile}`, e);
        }
      }
    } catch (error) {
      logger.error('PLUGIN', 'ZIP扫描失败:', error);
    }
  }

  // 加载插件
  async loadPlugins() {
    if (this.isLoading) {
      logger.warn('PLUGIN', '插件加载正在进行中，跳过重复加载');
      return;
    }

    this.isLoading = true;
    logger.info('PLUGIN', '开始加载插件...');

    try {
      // 解压新的ZIP插件包
      await this.extractPlugins();

      // 清除现有插件
      await this.cleanup();
      this.plugins.clear();
      this.defaultPlugin = null;

      // 确保插件目录存在
      if (!fs.existsSync(this.pluginDir)) {
        logger.warn('PLUGIN', `创建插件目录: ${this.pluginDir}`);
        fs.mkdirSync(this.pluginDir, { recursive: true });
        this.isLoading = false;
        return;
      }

      const pluginDirs = fs.readdirSync(this.pluginDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let loadedCount = 0;

      for (const dir of pluginDirs) {
        const manifestPath = path.join(this.pluginDir, dir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
          logger.warn('PLUGIN', `${dir} 缺少 manifest.json`);
          continue;
        }

        try {
          // 清除require缓存
          delete require.cache[require.resolve(manifestPath)];

          const manifest = require(manifestPath);
          const pluginPath = path.join(this.pluginDir, dir, manifest.mainExport);

          // 清除插件模块缓存
          delete require.cache[require.resolve(pluginPath)];

          const pluginModule = require(pluginPath);
          const pluginObj = pluginModule[manifest.name];

          if (!pluginObj || typeof pluginObj.main !== 'function') {
            logger.warn('PLUGIN', `${manifest.name} 缺少 main 方法`);
            continue;
          }

          // 注入上下文到插件对象
          pluginObj.ctx = this.context;

          // 注册处理类型
          manifest.processingTypes.forEach(type => {
            if (type === 'default') {
              this.defaultPlugin = pluginObj;
            } else {
              this.plugins.set(type, pluginObj);
            }
          });

          // 初始化插件
          if (typeof pluginObj.init === 'function') {
            await pluginObj.init();
            logger.plugin('PLUGIN', `${manifest.name} 初始化完成`);
          }

          loadedCount++;
        } catch (e) {
          logger.error('PLUGIN', `加载失败: ${dir}`, e);
        }
      }

      logger.info('PLUGIN', `插件加载完成，共加载 ${loadedCount}/${pluginDirs.length} 个插件`);
    } catch (error) {
      logger.error('PLUGIN', '插件加载失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // 启动目录监听
  startWatching() {
    if (this.watcher) return;

    logger.info('PLUGIN', `启动插件目录监听: ${this.pluginDir}`);

    this.watcher = fs.watch(this.pluginDir, (eventType, filename) => {
      if (!filename) return;

      const filePath = path.join(this.pluginDir, filename);

      try {
        // 检查文件类型
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          const isDirectory = stat.isDirectory();
          const isZip = filename.endsWith('.zip');

          if (isDirectory || isZip) {
            logger.info('PLUGIN', `检测到插件变更: ${eventType} ${filename}`);

            // 防抖处理
            if (this.reloadDebounce) clearTimeout(this.reloadDebounce);

            this.reloadDebounce = setTimeout(async () => {
              logger.info('PLUGIN', '检测到插件变更，重新加载插件...');
              await this.reloadPlugins();
            }, 1000);
          }
        }
      } catch (err) {
        logger.error('PLUGIN', `文件检测错误: ${filename}`, err);
      }
    });

    this.watcher.on('error', (err) => {
      logger.error('PLUGIN', '目录监听错误:', err);
    });
  }

  // 重新加载插件
  async reloadPlugins() {
    try {
      logger.info('PLUGIN', '开始重新加载插件...');
      await this.loadPlugins();
      logger.info('PLUGIN', '插件重载完成');
    } catch (e) {
      logger.error('PLUGIN', '插件重载失败:', e);
    }
  }

  async processMessage(msgType, msgContent, senderOpenid, isPrivate) {
    // 优先使用匹配的插件
    const plugin = this.plugins.get(msgType);
    if (plugin) {
      try {
        return await plugin.main(msgType, msgContent, senderOpenid, isPrivate);
      } catch (e) {
        logger.error('PLUGIN', `${msgType}处理失败:`, e);
        return "插件处理出错";
      }
    }

    // 其次使用默认插件
    if (this.defaultPlugin) {
      try {
        return await this.defaultPlugin.main(msgType, msgContent, senderOpenid, isPrivate);
      } catch (e) {
        logger.error('PLUGIN', '默认插件处理失败:', e);
      }
    }

    return null;
  }

  async cleanup() {
    logger.info('PLUGIN', '清理插件资源...');

    const cleanupPlugin = async (plugin, name = '') => {
      if (typeof plugin.cleanup === 'function') {
        try {
          await plugin.cleanup();
          logger.debug('PLUGIN', `${name} 清理完成`);
        } catch (e) {
          logger.error('PLUGIN', `${name} 清理失败:`, e);
        }
      }
    };

    // 清理普通插件
    for (const [type, plugin] of this.plugins) {
      await cleanupPlugin(plugin, type);
    }

    // 清理默认插件
    if (this.defaultPlugin) {
      await cleanupPlugin(this.defaultPlugin, '默认插件');
    }
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('PLUGIN', '停止插件目录监听');
    }
  }
}

// === QQ 机器人主类 ===
class QQBot {
  constructor() {
    this.heartbeat_interval = 0;
    this.expires_in = 0;
    this.session_id = null;
    this.seq = 0;
    this.restoreLink = false;
    this.accessToken = null;
    this.isConnecting = false;
    this.isShuttingDown = false;

    // 定时器
    this.heartbeatTimer = null;
    this.tokenRefreshTimer = null;
    this.connectionResetTimer = null;

    // WebSocket
    this.ws = null;

    // 插件系统
    this.pluginManager = new PluginManager(pluginContext);

    // 崩溃恢复
    process.on('uncaughtException', (err) => {
      logger.error('CRASH', `未捕获异常: ${err.stack}`);
      this.safeResetConnection();
    });

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('BOT', '开始关闭机器人...');

    // 清理资源
    this.cleanupResources();

    // 清理插件
    await this.pluginManager.cleanup();
    this.pluginManager.stopWatching();

    logger.info('BOT', '机器人已安全关闭');
    process.exit(0);
  }

  // 主初始化函数
  async init() {
    if (this.isConnecting) {
      logger.warn('BOT', '连接已在进行中，跳过重复连接');
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('BOT', '开始初始化机器人...');

      // 加载插件
      await this.pluginManager.loadPlugins();
      this.pluginManager.startWatching();

      await this.setupConnection();
      this.scheduleConnectionReset();

      logger.info('BOT', '机器人初始化完成');
    } catch (error) {
      logger.error('BOT', `初始化失败: ${error.message}`);
      this.safeResetConnection(5000);
    } finally {
      this.isConnecting = false;
    }
  }

  // 建立连接
  async setupConnection() {
    await this.anewGetAccessToken();
    const wsLinkData = await getWsLink(this.accessToken);
    logger.info('WS', `获取WS链接: ${wsLinkData.url}`);

    // 关闭现有连接
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.ws = new WebSocket(wsLinkData.url);
    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (err) => this.handleError(err));
  }

  // 连接打开处理
  handleOpen() {
    logger.info('WS', '连接成功');

    if (this.restoreLink) {
      logger.debug('WS', '发送恢复连接请求', {
        session_id: this.session_id,
        seq: this.seq + 1
      });

      this.ws.send(JSON.stringify({
        op: 6,
        d: {
          token: `QQBot ${this.accessToken}`,
          session_id: this.session_id,
          seq: this.seq + 1
        }
      }));

      this.restoreLink = false;
    } else {
      this.sendSession(`QQBot ${this.accessToken}`);
    }
  }

  // 消息处理
  handleMessage(data) {
    try {
      const ev = JSON.parse(data.toString());

      // 精简日志输出
      const loggableEvent = {
        op: ev.op,
        t: ev.t,
        s: ev.s,
        d: ev.d ? {
          heartbeat_interval: ev.d.heartbeat_interval,
          session_id: ev.d.session_id,
          content: ev.d.content ? `${ev.d.content.substring(0, 50)}...` : undefined
        } : undefined
      };

      logger.debug('WS', `收到消息: ${JSON.stringify(loggableEvent)}`);

      // 处理业务消息
      if (ev.d?.content) {
        this.processMessages(
          ev.d.content,
          ev.d.id,
          ev.d.group_openid,
          ev.d.author?.id
        );
      }

      // 更新心跳间隔
      if (ev.d?.heartbeat_interval) {
        this.heartbeat_interval = ev.d.heartbeat_interval;
        logger.debug('WS', `设置心跳周期: ${this.heartbeat_interval}ms`);
      }

      // 更新序列号
      if (ev.s) {
        this.seq = ev.s;
        logger.debug('WS', `更新序列号: ${this.seq}`);
      }

      // 首次连接处理
      if (ev.t === "READY") {
        this.session_id = ev.d.session_id;
        logger.info('WS', `获取Session ID: ${this.session_id}`);
        this.sendHeartbeat();
      }

      // 重连指令
      if (ev.op === 7 || ev.op === 9) {
        logger.info('WS', "收到重连指令");
        this.safeResetConnection();
      }
    } catch (err) {
      logger.error('WS', '消息解析失败:', err);
    }
  }

  // 关闭连接处理
  handleClose() {
    logger.warn('WS', "连接关闭，尝试重连...");
    this.safeResetConnection(3000);
  }

  // 错误处理
  handleError(err) {
    logger.error('WS', `连接错误: ${err.message}`);
    this.safeResetConnection(5000);
  }

  // 安全重置连接
  safeResetConnection(delay = 0) {
    if (this.isShuttingDown) return;

    logger.warn('BOT', `安全重置连接${delay ? ` (${delay}ms后)` : ''}`);
    this.cleanupResources();

    setTimeout(() => {
      this.restoreLink = true;
      this.init().catch(err => {
        logger.error('BOT', `重连失败: ${err.message}`);
        this.safeResetConnection(10000);
      });
    }, delay);
  }

  // 清理资源
  cleanupResources() {
    // 清除定时器
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.connectionResetTimer) {
      clearTimeout(this.connectionResetTimer);
      this.connectionResetTimer = null;
    }

    // 关闭WebSocket
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  // 定期重置连接（1小时）
  scheduleConnectionReset() {
    const RESET_INTERVAL = 60 * 60 * 1000; // 1小时

    this.connectionResetTimer = setTimeout(() => {
      logger.info('BOT', "定期连接重置");
      this.safeResetConnection();
    }, RESET_INTERVAL);

    logger.debug('BOT', `已安排 ${RESET_INTERVAL / 60000} 分钟后重置连接`);
  }

  // 发送心跳
  sendHeartbeat() {
    // 立即发送首次心跳
    this.ws.send(JSON.stringify({ op: 1, d: null }));
    logger.debug('HEARTBEAT', "发送首次心跳");

    // 设置周期性心跳
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.ws.send(JSON.stringify({ op: 1, d: this.seq }));
      logger.debug('HEARTBEAT', `发送心跳 (seq: ${this.seq})`);
    }, this.heartbeat_interval);
  }

  // 发送鉴权session
  sendSession(token) {
    const msg = {
      op: 2,
      d: {
        token: token,
        intents: 0 | 1 << 25,
        shard: [0, 1],
        properties: {}
      }
    };

    logger.debug('AUTH', "发送鉴权请求");
    this.ws.send(JSON.stringify(msg));
  }

  // 获取新访问令牌
  async anewGetAccessToken() {
    try {
      logger.info('TOKEN', "获取访问令牌...");
      const accessTokenData = await getAccessToken();

      this.accessToken = accessTokenData.access_token;
      this.expires_in = accessTokenData.expires_in * 1000;

      logger.info('TOKEN', `获取Token成功`);
      logger.debug('TOKEN', `有效期: ${Math.floor(this.expires_in / 1000)}秒`);

      // 设置定时刷新
      if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);

      const refreshTime = this.expires_in - 60000; // 提前1分钟刷新
      this.tokenRefreshTimer = setTimeout(() => {
        logger.info('TOKEN', "刷新访问令牌");
        this.anewGetAccessToken();
      }, refreshTime);

      logger.debug('TOKEN', `安排 ${Math.floor(refreshTime / 1000)} 秒后刷新令牌`);
    } catch (error) {
      logger.error('TOKEN', `获取Token失败: ${error.message}`);
      throw error;
    }
  }

  async processMessages(msg, id, group_id, sender_openid) {
    try {
      let isPrivate = !group_id;
      logger.info('MSG', `收到 [${isPrivate ? '私聊' : '群聊'}] 消息 [${sender_openid}]: ${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}`);

      const trimmed = msg.replace(/^[\s]+/, '');
      const match = trimmed.match(/^(\S+)([\s\S]*)$/);
      if (!match) {
        logger.warn('MSG', '无法解析消息格式');
        return;
      }

      const msgType = match[1];
      const msgContent = (match[2] || '').trim();

      // 通过插件处理消息
      const retMsg = await this.pluginManager.processMessage(
        msgType,
        msgContent,
        sender_openid,
        isPrivate
      );

      // 无响应内容
      if (!retMsg) return;

      // 消息发送
      if (typeof retMsg === 'string' && retMsg.trim()) {
        // 旧版本插件，发送文本
        if (isPrivate) {
          sendPrivateMessage(this.accessToken, retMsg, id, sender_openid);
          logger.info('MSG', '发送私聊文本回复');
        } else {
          botSendMessage(this.accessToken, retMsg, id, group_id);
          logger.info('MSG', '发送群聊文本回复');
        }
      } else if (typeof retMsg === 'object') {
        // 新版本插件
        if (retMsg.image) {
          let url;

          if (typeof retMsg.image === 'string') {
            url = retMsg.image;
          } else {
            url = await img2Url(retMsg.image);
          }

          logger.debug('IMG', '图片URL获取成功');

          if (isPrivate) {
            // 私聊图片处理
            const fileinfo = await uploadImageForPrivate(this.accessToken, url, sender_openid);
            logger.debug('IMG', '私聊图片fileinfo获取成功');
            sendPrivateImageMessage(this.accessToken, retMsg.text || '', fileinfo, id, sender_openid);
            logger.info('MSG', '发送私聊图片回复');
          } else {
            // 群聊图片处理
            const fileinfo = await uploadImage(this.accessToken, url, group_id);
            logger.debug('IMG', '群聊图片fileinfo获取成功');
            botSendImageMessage(this.accessToken, retMsg.text || '', fileinfo, id, group_id);
            logger.info('MSG', '发送群聊图片回复');
          }
        } else if (retMsg.text) {
          if (isPrivate) {
            sendPrivateMessage(this.accessToken, retMsg.text, id, sender_openid);
            logger.info('MSG', '发送私聊文本回复');
          } else {
            botSendMessage(this.accessToken, retMsg.text, id, group_id);
            logger.info('MSG', '发送群聊文本回复');
          }
        }
      }
    } catch (error) {
      logger.error('MSG', `消息处理失败: ${error.message}`);
    }
  }
}

// 启动机器人
const bot = new QQBot();
bot.init().catch(err => {
  logger.error('BOT', `启动失败: ${err.message}`);
  process.exit(1);
});
