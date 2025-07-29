const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { getAccessToken, getWsLink, uploadImage, botSendMessage, botSendImageMessage } = require('./api');
const img2Url = require('./image')
const AdmZip = require('adm-zip'); // 用于解压ZIP文件
const { md2html, html2img, md2img } = require('./toImg'); // 引入图片生成模块

// 创建插件上下文对象
const pluginContext = {
  utils: {
    md2html,
    html2img,
    md2img
  }
};

// === 插件管理器 ===
class PluginManager {
  constructor(ctx) {
    this.plugins = new Map(); // 消息类型 => 插件对象
    this.defaultPlugin = null; // 默认插件
    this.pluginDir = path.join(__dirname, 'plugins');
    this.context = ctx;
    this.watcher = null; // 文件系统监听器
    this.reloadDebounce = null; // 重载防抖计时器
  }

  // 解压插件ZIP包
  async extractPlugins() {
    try {
      const files = fs.readdirSync(this.pluginDir);
      const zipFiles = files.filter(file => file.endsWith('.zip'));

      for (const zipFile of zipFiles) {
        const zipPath = path.join(this.pluginDir, zipFile);
        console.log(`[PLUGIN] 发现ZIP插件包: ${zipFile}`);

        try {
          const zip = new AdmZip(zipPath);
          const entries = zip.getEntries();

          // 检查ZIP结构是否有效
          const topLevelDirs = new Set();
          entries.forEach(entry => {
            if (entry.isDirectory) return;
            const parts = entry.entryName.split('/');
            if (parts.length > 1) {
              topLevelDirs.add(parts[0]);
            }
          });

          if (topLevelDirs.size !== 1) {
            console.error(`[PLUGIN] ZIP包结构无效: ${zipFile} - 应包含单个顶级目录`);
            continue;
          }

          const pluginDirName = [...topLevelDirs][0];
          const targetDir = path.join(this.pluginDir, pluginDirName);

          // 解压前备份已存在的插件
          if (fs.existsSync(targetDir)) {
            const backupDir = `${targetDir}_${Date.now()}`;
            console.log(`[PLUGIN] 插件目录已存在, 备份到: ${backupDir}`);
            fs.renameSync(targetDir, backupDir);
          }

          // 解压ZIP文件
          console.log(`[PLUGIN] 解压到: ${targetDir}`);
          zip.extractAllTo(this.pluginDir, true);

          // 删除ZIP文件
          fs.unlinkSync(zipPath);
          console.log(`[PLUGIN] 已删除ZIP文件: ${zipFile}`);

        } catch (e) {
          console.error(`[PLUGIN] 解压失败: ${zipFile}`, e);
        }
      }
    } catch (error) {
      console.error('[PLUGIN] ZIP扫描失败:', error);
    }
  }

  // 加载插件
  async loadPlugins() {
    // 解压新的ZIP插件包
    await this.extractPlugins();

    // 清除现有插件
    this.plugins.clear();
    this.defaultPlugin = null;

    try {
      // 确保插件目录存在
      if (!fs.existsSync(this.pluginDir)) {
        console.warn(`[PLUGIN] 创建插件目录: ${this.pluginDir}`);
        fs.mkdirSync(this.pluginDir, { recursive: true });
        return;
      }

      const pluginDirs = fs.readdirSync(this.pluginDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dir of pluginDirs) {
        const manifestPath = path.join(this.pluginDir, dir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
          console.warn(`[PLUGIN] ${dir} 缺少 manifest.json`);
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

          // 注入上下文到插件对象
          pluginObj.ctx = this.context;

          if (!pluginObj || typeof pluginObj.main !== 'function') {
            console.warn(`[PLUGIN] ${manifest.name} 缺少 main 方法`);
            continue;
          }

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
            console.log(`[PLUGIN] ${manifest.name} 初始化完成`);
          }
        } catch (e) {
          console.error(`[PLUGIN] 加载失败: ${dir}`, e);
        }
      }
      console.log(`[PLUGIN] 插件加载完成，共加载 ${pluginDirs.length} 个插件`);
    } catch (error) {
      console.error('[PLUGIN] 插件加载失败:', error);
    }
  }

  // 启动目录监听（使用原生fs.watch）
  startWatching() {
    if (this.watcher) return;

    console.log('[PLUGIN] 启动插件目录监听');

    // 创建原生文件系统监听器
    this.watcher = fs.watch(this.pluginDir, (eventType, filename) => {
      if (!filename) return;

      console.log(`[PLUGIN] 检测到变更: ${eventType} ${filename}`);

      // 只处理第一层目录变化
      const filePath = path.join(this.pluginDir, filename);
      const isDirectory = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();

      if (isDirectory || filename.endsWith('.zip')) {
        console.log(`[PLUGIN] 检测到插件相关变更: ${filename}`);

        // 防抖处理（500毫秒）
        if (this.reloadDebounce) clearTimeout(this.reloadDebounce);

        this.reloadDebounce = setTimeout(async () => {
          console.log('[PLUGIN] 重新加载插件...');
          await this.reloadPlugins();
        }, 500);
      }
    });

    // 处理错误
    this.watcher.on('error', (err) => {
      console.error('[PLUGIN] 目录监听错误:', err);
    });
  }

  // 重新加载插件
  async reloadPlugins() {
    try {
      // 清理现有插件
      await this.cleanup();

      // 加载新插件
      await this.loadPlugins();
      console.log('[PLUGIN] 插件重载完成');
    } catch (e) {
      console.error('[PLUGIN] 插件重载失败:', e);
    }
  }

  async processMessage(msgType, msgContent, senderOpenid) {
    // 优先使用匹配的插件
    const plugin = this.plugins.get(msgType);
    if (plugin) {
      try {
        return await plugin.main(msgType, msgContent, senderOpenid);
      } catch (e) {
        console.error(`[PLUGIN] ${msgType} 处理失败:`, e);
        return "插件处理出错";
      }
    }

    // 其次使用默认插件
    if (this.defaultPlugin) {
      try {
        return await this.defaultPlugin.main(msgType, msgContent, senderOpenid);
      } catch (e) {
        console.error('[PLUGIN] 默认插件处理失败:', e);
      }
    }

    return null; // 无匹配插件
  }

  async cleanup() {
    for (const [_, plugin] of this.plugins) {
      if (typeof plugin.cleanup === 'function') {
        try {
          await plugin.cleanup();
        } catch (e) {
          console.error('[PLUGIN] 清理失败:', e);
        }
      }
    }

    if (this.defaultPlugin && typeof this.defaultPlugin.cleanup === 'function') {
      try {
        await this.defaultPlugin.cleanup();
      } catch (e) {
        console.error('[PLUGIN] 默认插件清理失败:', e);
      }
    }

    // 清除插件引用
    this.plugins.clear();
    this.defaultPlugin = null;
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[PLUGIN] 停止插件目录监听');
    }
  }
}

// === QQ 机器人主类 ===
class QQBot {
  constructor() {
    // 连接相关状态
    this.heartbeat_interval = 0;
    this.expires_in = 0;
    this.session_id = null;
    this.seq = 0;
    this.restoreLink = false;
    this.accessToken = null;

    // 定时器
    this.heartbeatTimer = null;
    this.tokenRefreshTimer = null;
    this.connectionResetTimer = null;

    // WebSocket 实例
    this.ws = null;

    // 插件系统
    this.pluginManager = new PluginManager(pluginContext); // 传入上下文

    // 崩溃恢复
    process.on('uncaughtException', (err) => {
      console.error(`[CRASH] 未捕获异常: ${err.stack}`);
      this.safeResetConnection();
    });
  }

  // 主初始化函数
  async init() {
    try {
      // 加载插件
      await this.pluginManager.loadPlugins();

      // 启动插件目录监听
      this.pluginManager.startWatching();

      await this.setupConnection();
      this.scheduleConnectionReset();

    } catch (error) {
      console.error(`初始化失败: ${error.message}`);
      this.safeResetConnection(5000);
    }
  }

  // 建立连接
  async setupConnection() {
    await this.anewGetAccessToken();
    const wsLinkData = await getWsLink(this.accessToken);
    console.log(`WS链接: ${wsLinkData.url}`);

    this.ws = new WebSocket(wsLinkData.url);

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (err) => this.handleError(err));
  }

  // 连接打开处理
  handleOpen() {
    console.log("WS连接成功");

    if (this.restoreLink) {
      console.log("恢复连接", JSON.stringify({
        op: 6,
        d: {
          token: `QQBot ${this.accessToken}`,
          session_id: this.session_id,
          seq: this.seq + 1
        }
      }));

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
    const ev = JSON.parse(data.toString());
    console.log(`收到消息: ${JSON.stringify(ev)}`);

    // 处理业务消息
    if (ev.d?.content) {
      this.processMessages(
        ev.d.content,
        ev.d.id,
        ev.d.group_openid,
        ev.d.author?.member_openid
      );
    }

    // 更新心跳间隔
    if (ev.d?.heartbeat_interval) {
      this.heartbeat_interval = ev.d.heartbeat_interval;
      console.log(`心跳周期: ${this.heartbeat_interval}`);
    }

    // 更新序列号
    if (ev.s) {
      this.seq = ev.s;
      console.log(`序列号: ${this.seq}`);
    }

    // 首次连接处理
    if (ev.t === "READY") {
      this.session_id = ev.d.session_id;
      console.log(`Session ID: ${this.session_id}`);
      this.sendHeartbeat();
    }

    // 重连指令
    if (ev.op === 7 || ev.op === 9) {
      console.log("收到重连指令");
      this.safeResetConnection();
    }
  }

  // 关闭连接处理
  handleClose() {
    console.log("连接关闭，尝试重连...");
    this.safeResetConnection(3000);
  }

  // 错误处理
  handleError(err) {
    console.error(`WS错误: ${err.message}`);
    this.safeResetConnection(5000);
  }

  // 安全重置连接
  safeResetConnection(delay = 0) {
    console.log(`安全重置连接${delay ? ` (${delay}ms后)` : ''}`);
    this.cleanupResources();

    setTimeout(() => {
      this.restoreLink = true;
      this.init().catch(err => {
        console.error(`重连失败: ${err.message}`);
        this.safeResetConnection(10000);
      });
    }, delay);
  }

  // 清理资源
  cleanupResources() {
    // 清除定时器
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    if (this.connectionResetTimer) clearTimeout(this.connectionResetTimer);

    // 关闭WebSocket
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    // 清理插件资源
    this.pluginManager.cleanup();
    this.pluginManager.stopWatching();

    // 重置状态
    this.heartbeat_interval = 0;
    this.heartbeatTimer = null;
  }

  // 定期重置连接（1小时）
  scheduleConnectionReset() {
    const RESET_INTERVAL = 1 * 60 * 60 * 1000;

    this.connectionResetTimer = setTimeout(() => {
      console.log("定期连接重置");
      this.safeResetConnection();
    }, RESET_INTERVAL);
  }

  // 发送心跳
  sendHeartbeat() {
    // 立即发送首次心跳
    this.ws.send(JSON.stringify({ op: 1, d: null }));
    console.log("发送首次心跳");

    // 设置周期性心跳
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      this.ws.send(JSON.stringify({ op: 1, d: this.seq }));
      console.log(`发送心跳 (seq: ${this.seq})`);
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

    console.log(`发送鉴权: ${JSON.stringify(msg)}`);
    this.ws.send(JSON.stringify(msg));
  }

  // 获取新访问令牌
  async anewGetAccessToken() {
    try {
      const accessTokenData = await getAccessToken();

      // 修正数据结构访问方式
      this.accessToken = accessTokenData.access_token;
      this.expires_in = accessTokenData.expires_in * 1000;

      console.log(`获取Token成功: ${this.accessToken}`);
      console.log(`Token有效期: ${this.expires_in}ms`);

      // 设置定时刷新
      if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);

      this.tokenRefreshTimer = setTimeout(() => {
        console.log("刷新访问令牌");
        this.anewGetAccessToken();
      }, this.expires_in - 60000); // 提前1分钟刷新
    } catch (error) {
      console.error(`获取Token失败: ${error.message}`);
      throw new Error("Token获取失败");
    }
  }

  async processMessages(msg, id, group_id, sender_openid) {
    try {
      console.log(`发消息人openid: ${sender_openid}`);
      const trimmed = msg.replace(/^[\s]+/, '');
      const match = trimmed.match(/^(\S+)([\s\S]*)$/);
      if (!match) {
        console.log('无法解析消息格式');
        return;
      }
      const msgType = match[1];
      const msgContent = match[2] || '';
      // 通过插件处理消息
      const retMsg = await this.pluginManager.processMessage(
        msgType,
        msgContent,
        sender_openid
      );

      // 发送回复
      // 处理插件兼容性
      if (Object.prototype.toString.call(retMsg) === '[object Object]') {
        // 新版本插件，支持发送图片和文本
        if (retMsg.image) {
          let url;
          if (typeof retMsg.image == 'string') {
            url = retMsg.image
          } else {
            url = await img2Url(retMsg.image)
          }
          console.log('图片上传成功')
          let fileinfo = await uploadImage(this.accessToken, url, group_id)
          console.log('fileinfo 获取成功')
          botSendImageMessage(this.accessToken, retMsg.text, fileinfo, id, group_id)
        } else {
          botSendMessage(this.accessToken, retMsg.text, id, group_id);
        }
      } else {
        // 旧版本插件，发送文本
        if (retMsg?.trim()) {
          botSendMessage(this.accessToken, retMsg, id, group_id);
        }
      }
    } catch (error) {
      console.error(`消息处理失败: ${error.message}`);
    }
  }
}

// 启动机器人
const bot = new QQBot();
bot.init().catch(err => {
  console.error(`机器人启动失败: ${err.message}`);
  process.exit(1);
});

