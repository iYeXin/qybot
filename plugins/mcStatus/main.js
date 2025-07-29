const MCStatusChecker = require('./mcstatus');

// 创建状态检查器实例
const statusChecker = new MCStatusChecker();

module.exports = {
    mcStatusPlugin: {
        async init() {
            console.log('[MC Status] 插件初始化完成');
            console.log(`[MC Status] 监控服务器: ${statusChecker.serverAddress}`);
        },

        async main(msgType, msgContent, senderOpenid) {
            try {
                return await statusChecker.getFormattedStatus();
            } catch (error) {
                console.error('[MC Status] 状态获取失败:', error);
                return "服务器状态查询失败";
            }
        },

        async cleanup() {
            console.log('[MC Status] 插件清理完成');
        }
    }
};
