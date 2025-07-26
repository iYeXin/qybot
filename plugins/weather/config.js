
// 插件使用和风天气api（https://console.qweather.com/）
// 请在注册后创建项目，并对项目创建凭据（API key）
// 请在https://console.qweather.com/的设置页面获取你的API Host
// 完善下列配置即可使用

module.exports = {
    PLUGIN_NAME: "天气插件",
    WEATHER_API_HOST: "https://abcxyz.qweatherapi.com", // 请将abcxyz.qweatherapi.com替换为控制台设置中的API Host
    WEATHER_API_KEY: "xxxxxx", // 请替换为实际API Key
    DEFAULT_LOCATION: "101010100", // 默认北京LocationID
    TIMEOUT: 5000, // 请求超时时间(毫秒)
    GENSHIN_PLACE: false // 是否加入原神地名（随机加载）
};
