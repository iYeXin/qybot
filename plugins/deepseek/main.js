const fs = require('fs');
const path = require('path');
const DeepSeekAPI = require('./deepseek');

// 加载配置
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 创建API实例
const deepseekAPI = new DeepSeekAPI(config.API_KEY);

let wide = ''

module.exports = {
    deepseekPlugin: {
        // 插件初始化
        async init() {
            console.log('[DeepSeek] 插件初始化完成');
        },

        // 主消息处理函数
        async main(msgType, msgContent, senderOpenid) {
            try {
                if (msgType.startsWith('/')) msgType = msgType.slice(1)
                if (msgType.endsWith('-w')) [msgType, wide] = msgType.split('-')
                switch (msgType) {
                    case 'chat':
                    case 'chatr1':
                        return await this.handleChat(
                            msgType === 'chat' ? 'deepseek-chat' : 'deepseek-reasoner',
                            msgContent
                        );

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

        // 处理聊天请求（新增图片转换和降级处理）
        async handleChat(model, content) {
            const fullContent = `${content}${config.SAFE_RESPONSE_CONFIG}`;
            const markdownResponse = await deepseekAPI.chat(model, fullContent);

            if (!this.ctx?.utils?.md2img) {
                console.log('[DeepSeek] 上下文未提供md2img方法，返回原始Markdown');
                return markdownResponse;
            }

            try {
                let imageConversion;
                if (wide) {
                    imageConversion = this.ctx.utils.md2img(markdownResponse, { imgOptions: { width: 1080 } });
                } else {
                    imageConversion = this.ctx.utils.md2img(markdownResponse);
                }
                // 设置5秒超时
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('图片转换超时')), 8000)
                );

                const imageBuffer = await Promise.race([imageConversion, timeout]);

                return {
                    text: ' ',
                    image: imageBuffer
                };
            } catch (conversionError) {
                console.error(`[DeepSeek] Markdown转图片失败: ${conversionError.message}`);

                // 降级处理：返回原始Markdown文本
                return markdownResponse;
            }
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
