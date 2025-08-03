module.exports = {
    // 热搜接口基地址
    BASE_URL: process.env.HOT_SEARCH_BASE_URL || 'https://hot.qybot.yexin.wiki',

    // 图片生成配置
    IMAGE_CONFIG: {
        width: 600,
        timeout: 30000, // 30秒超时
        quality: 90
    },

    // 表格布局配置
    TABLE_CONFIG: {
        columns: 4, // 平台列表列数
        maxItems: 50 // 最多显示的热搜条目数
    },

    PLATFORM_MAP: {
        "原神": "genshin",
        "哔哩哔哩": "bilibili",
        "百度": "baidu",
        "csdn": "csdn",
        "豆瓣电影": "douban-movie",
        "抖音": "douyin",
        "米游社": "miyoushe",
        "快手": "kuaishou",
        "稀土掘金": "juejin",
        "崩铁": "starrail",
        "微信读书": "weread",
        "NGA": "ngabbs",
        "今日头条": "toutiao",
        "IT之家": "ithome",
        "贴吧": "tieba",
        "hellogitbub": "hellogithub",
        "少数派": "sspai",
        "澎湃新闻": "thepaper",
        "微博": "weibo"
    }
};
