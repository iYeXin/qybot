const http = require('http');
const https = require('https');

module.exports = {
  randomImage: {
    async main(msgType, msgContent, senderOpenid) {
      try {
        const apiUrl = 'http://acg.yaohud.cn/dm/acg.php?return=json';

        // 根据协议选择模块
        const protocolModule = apiUrl.startsWith('https') ? https : http;

        const { acgurl } = await new Promise((resolve, reject) => {
          protocolModule.get(apiUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const result = JSON.parse(data);
                if (result.code === '200') resolve(result);
                else reject(new Error('API返回错误'));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });

        return {
          text: '✨ 今日随机二次元图片',
          image: acgurl
        };

      } catch (error) {
        console.error('[随机图片插件] 错误:', error);
        return '图片获取失败，请稍后再试~';
      }
    }
  }
};