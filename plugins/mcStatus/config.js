module.exports = {
    // 服务器地址（格式：域名或IP:端口  示例：mc.com:6789）
    SERVER_ADDRESS: "",

    // 服务器离线时显示的消息
    OFFLINE_MESSAGE: "喵呜~~服务器不在线呢~嘻嘻嘻",

    // 服务器在线时的格式化模板
    // 可用占位符：
    // {version} - 服务器版本
    // {online} - 当前在线人数
    // {max} - 最大在线人数
    // {players} - 在线玩家列表
    // {motd} - 服务器 MOTD
    get ONLINE_TEMPLATE() {
        return `
【MC服务器状态】
版本：{version}
在线人数：{online}/{max}
在线玩家：{players}

{motd}`;
    },

    // 请求超时时间（毫秒）
    TIMEOUT: 10000
};
