const { getBingWallpaper } = require('./getUrl')
const { isUHD } = require('./config.json')

module.exports = {
    bingImagePlugin: {
        async main(msgType, msgContent, senderOpenid) {
            try {
                return { text: '今日 Bing 壁纸', image: await getBingWallpaper(isUHD) }
            } catch {
                return { text: '获取 Bing 壁纸时发生了一些错误' }
            }
        },
    },
};