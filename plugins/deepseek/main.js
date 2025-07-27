const fs = require('fs');
const path = require('path');
const DeepSeekAPI = require('./deepseek');

// 加载配置
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 创建API实例
const deepseekAPI = new DeepSeekAPI(config.API_KEY);

module.exports = {
    deepseekPlugin: {
        // 插件初始化
        async init() {
            console.log('[DeepSeek] 插件初始化完成');
        },

        // 主消息处理函数
        async main(msgType, msgContent, senderOpenid) {
            try {
                if (msgType.startsWith('/')) msgType.slice(1)
                switch (msgType) {
                    case 'chat':
                        return await this.handleChat('deepseek-chat', msgContent);

                    case 'chatr1':
                        return await this.handleChat('deepseek-reasoner', msgContent);

                    case 'deepseek':
                        return await this.handleBalance();

                    default:
                        return `未知的 DeepSeek 命令: ${msgType}`;
                }
            } catch (error) {
                console.error('[DeepSeek] 处理失败:', error);
                return 'DeepSeek 服务暂时不可用';
            }
        },

        // 处理聊天请求
        async handleChat(model, content) {
            const fullContent = `${content}${config.SAFE_RESPONSE_CONFIG}`;
            return await deepseekAPI.chat(model, fullContent);
        },

        // 处理余额查询
        async handleBalance() {
            const data = await deepseekAPI.getBalance();
            const able = data.is_available ? '服务可用' : '余额不足';
            const balance = data.balance_infos[0].total_balance;
            return `${able}：\n剩余余额：￥${balance}`;
        },

        // 清理资源（可选）
        async cleanup() {
            console.log('[DeepSeek] 插件清理完成');
        }
    }
};
