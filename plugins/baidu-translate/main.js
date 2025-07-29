const crypto = require('crypto');
const https = require('https');
const config = require('./config');

// 常见语言映射表
const LANGUAGE_MAP = {
  '自动检测': 'auto',
  '中文': 'zh',
  '英语': 'en',
  '粤语': 'yue',
  '文言文': 'wyw',
  '日语': 'jp',
  '韩语': 'kor',
  '法语': 'fra',
  '西班牙语': 'spa',
  '泰语': 'th',
  '阿拉伯语': 'ara',
  '俄语': 'ru',
  '葡萄牙语': 'pt',
  '德语': 'de',
  '意大利语': 'it',
  '希腊语': 'el',
  '荷兰语': 'nl',
  '波兰语': 'pl',
  '保加利亚语': 'bul',
  '爱沙尼亚语': 'est',
  '丹麦语': 'dan',
  '芬兰语': 'fin',
  '捷克语': 'cs',
  '罗马尼亚语': 'rom',
  '斯洛文尼亚语': 'slo',
  '瑞典语': 'swe',
  '匈牙利语': 'hu',
  '繁体中文': 'cht',
  '越南语': 'vie'
};

module.exports = {
  translationPlugin: {
    /**
     * 插件主处理方法
     * @param {string} msgType - 消息类型
     * @param {string} msgContent - 消息内容
     * @param {string} senderOpenid - 发送者ID
     * @returns {Promise<string|object>} 处理结果
     */
    async main(msgType, msgContent, senderOpenid) {
      try {
        // 处理语言指令
        if (msgType === '语言' || msgType === '/语言') {
          return this.getLanguageList();
        }

        // 处理翻译指令
        if (msgType === '翻译' || msgType === '/翻译') {
          return this.processTranslation(msgContent);
        }

        return "未知指令，请使用'翻译'或'语言'指令";
      } catch (error) {
        console.error(`[翻译插件] 处理错误: ${error.message}`);
        return "翻译服务暂时不可用，请稍后再试";
      }
    },

    /**
     * 获取语言列表
     * @returns {string} 语言列表文本
     */
    getLanguageList() {
      let result = "【常用语种对照表】\n";
      result += "输入格式: @bot 翻译 #目标语言代码 要翻译的文本\n\n";

      for (const [name, code] of Object.entries(LANGUAGE_MAP)) {
        if (code !== 'auto') {
          result += `${name.padEnd(8)} -> ${code}\n`;
        }
      }

      result += "\n示例: \n@bot 翻译 #en 你好世界\n@bot 翻译 こんにちは";
      return result;
    },

    /**
     * 处理翻译请求
     * @param {string} content - 翻译内容
     * @returns {Promise<string>} 翻译结果
     */
    async processTranslation(content) {
      // 解析目标语言
      let targetLang = config.DEFAULT_TARGET;
      let textToTranslate = content.trim();

      // 检查是否有指定目标语言
      if (textToTranslate.startsWith('#')) {
        const spaceIndex = textToTranslate.indexOf(' ');
        if (spaceIndex === -1) {
          return "请提供要翻译的文本。格式: #目标语言 文本内容";
        }

        const langCode = textToTranslate.substring(1, spaceIndex).trim();
        textToTranslate = textToTranslate.substring(spaceIndex + 1).trim();

        // 查找目标语言代码
        targetLang = this.findLanguageCode(langCode);
        if (!targetLang) {
          return `无法识别的语言代码: ${langCode}，请使用"语言"指令获取常用语种代码`;
        }
      }

      // 检查文本长度
      if (textToTranslate.length > config.MAX_TEXT_LENGTH) {
        return `文本过长，最大支持${config.MAX_TEXT_LENGTH}个字符`;
      }

      // 调用翻译API
      return this.translateText(textToTranslate, config.AUTO_SOURCE, targetLang);
    },

    /**
     * 查找语言代码
     * @param {string} input - 用户输入的语言标识
     * @returns {string|null} 语言代码
     */
    findLanguageCode(input) {
      // 检查是否为已知代码
      const lowerInput = input.toLowerCase();
      for (const [name, code] of Object.entries(LANGUAGE_MAP)) {
        if (code.toLowerCase() === lowerInput) {
          return code;
        }
      }

      // 检查是否为中文名称
      return LANGUAGE_MAP[input] || null;
    },

    /**
     * 调用百度翻译API
     * @param {string} text - 要翻译的文本
     * @param {string} from - 源语言
     * @param {string} to - 目标语言
     * @returns {Promise<string>} 翻译结果
     */
    translateText(text, from, to) {
      return new Promise((resolve, reject) => {
        // 生成随机数
        const salt = Date.now().toString();

        // 生成签名
        const signStr = config.BAIDU_APPID + text + salt + config.BAIDU_APPKEY;
        const sign = crypto.createHash('md5').update(signStr).digest('hex');

        // 构建请求URL
        const queryParams = new URLSearchParams({
          q: text,
          from: from,
          to: to,
          appid: config.BAIDU_APPID,
          salt: salt,
          sign: sign
        });

        const url = `${config.API_URL}?${queryParams.toString()}`;

        https.get(url, (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const result = JSON.parse(data);

              // 处理API错误
              if (result.error_code) {
                reject(new Error(`翻译API错误: ${result.error_code}`));
                return;
              }

              // 提取翻译结果
              const translations = result.trans_result.map(item => item.dst);
              resolve(translations.join('\n'));
            } catch (e) {
              reject(new Error('解析翻译结果失败'));
            }
          });
        }).on('error', (err) => {
          reject(new Error(`网络请求失败: ${err.message}`));
        });
      });
    }
  }
};