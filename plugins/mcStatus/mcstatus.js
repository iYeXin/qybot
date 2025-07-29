const https = require('https');
const config = require('./config');

class MCStatusChecker {
    constructor() {
        this.serverAddress = config.SERVER_ADDRESS;
    }

    getStatus() {
        return new Promise((resolve, reject) => {
            const apiUrl = `https://api.mcstatus.io/v2/status/java/${this.serverAddress}`;

            const req = https.get(apiUrl, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`请求失败，状态码: ${res.statusCode}`));
                }

                let rawData = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => rawData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(rawData));
                    } catch (e) {
                        reject(new Error('解析JSON失败: ' + e.message));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error('请求失败: ' + e.message));
            });

            req.setTimeout(config.TIMEOUT, () => {
                req.destroy();
                reject(new Error('请求超时'));
            });
        });
    }

    async getFormattedStatus() {
        try {
            const data = await this.getStatus();

            if (!data.online) {
                return config.OFFLINE_MESSAGE;
            }

            // 处理玩家列表
            const playerList = data.players.list && data.players.list.length > 0
                ? data.players.list.map(p => `${p.name_clean}(${p.uuid})`).join('\n')
                : '暂无在线玩家';

            // 使用模板字符串格式化响应
            return config.ONLINE_TEMPLATE
                .replace('{version}', data.version?.name_clean || '未知版本')
                .replace('{online}', data.players?.online || 0)
                .replace('{max}', data.players?.max || 0)
                .replace('{players}', playerList)
                .replace('{motd}', data.motd?.clean || '无 MOTD 信息');
        } catch (error) {
            console.error(`获取MC状态失败: ${error.message}`);
            return "无法获取MC服务器状态";
        }
    }
}

module.exports = MCStatusChecker;
