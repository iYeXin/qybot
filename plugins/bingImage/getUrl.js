const https = require('https');
const { URL } = require('url');

async function getBingWallpaper(isUHD = false) {
    const apiUrl = 'https://cn.bing.com/hp/api/model';

    try {
        // 发起 HTTPS 请求获取 API 数据
        const response = await new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                // 注意：生产环境中应避免关闭证书验证
                rejectUnauthorized: false
            };

            https.get(apiUrl, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // 解析 JSON 数据
        const data = JSON.parse(response);
        if (!data?.MediaContents?.[0]?.ImageContent?.Image?.Url) {
            throw new Error('Invalid Bing API response');
        }

        // 获取原始壁纸 URL
        let wallpaperUrl = data.MediaContents[0].ImageContent.Image.Url;

        console.log(wallpaperUrl)

        // UHD 模式处理
        if (isUHD) {
            const idMatch = wallpaperUrl.match(/th\?id=([^&]+)/);

            if (idMatch) {
                // 移除分辨率后缀并构建 UHD URL
                const fullId = idMatch[1].replace(/_\d+x\d+\.\w+$/, '');
                wallpaperUrl = `https://global.bing.com/th?id=${fullId}_UHD.jpg`;
            } else {
                // 备用替换方案
                wallpaperUrl = wallpaperUrl
                    .replace('_1920x1080.webp', '_UHD.jpg')
                    .replace('s.cn.bing.net', 'global.bing.com');
            }
        }

        // 处理相对路径
        if (!wallpaperUrl.startsWith('http')) {
            wallpaperUrl = new URL(wallpaperUrl, 'https://cn.bing.com').href;
        }

        console.log(wallpaperUrl)
        return wallpaperUrl;
    } catch (error) {
        throw new Error(`Error fetching Bing wallpaper: ${error.message}`);
    }
}

module.exports = { getBingWallpaper }