const config = require('./config');
const https = require('https');
const zlib = require('zlib');
const genshinPlaces = require('./genshin.json')
const cityIds = require('./city_id.json')

// 解压Gzip响应
function decompressResponse(res, callback) {
    const encoding = res.headers['content-encoding'];
    if (encoding === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        let data = '';
        gunzip.on('data', chunk => data += chunk);
        gunzip.on('end', () => callback(data));
        gunzip.on('error', err => callback(null, err));
    } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => callback(data));
    }
}

// 发送API请求
function fetchWeatherData(path, params) {
    return new Promise((resolve, reject) => {
        const query = new URLSearchParams({ ...params, key: config.WEATHER_API_KEY });
        const url = `${config.WEATHER_API_HOST}${path}?${query}`;

        const req = https.get(url, { timeout: config.TIMEOUT }, res => {
            if (res.statusCode !== 200) {
                return reject(`API请求失败，状态码: ${res.statusCode}`);
            }

            decompressResponse(res, (data, err) => {
                if (err) return reject(`解压失败: ${err.message}`);
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(`JSON解析失败: ${e.message}`);
                }
            });
        });

        req.on('error', err => reject(`请求错误: ${err.message}`));
        req.on('timeout', () => {
            req.destroy();
            reject('请求超时');
        });
    });
}

// 获取城市LocationID
async function getLocationId(cityName) {
    try {
        if (config.GENSHIN_PLACE == true && genshinPlaces.includes(cityName)) {
            console.log({ id: cityIds[getRandomKey(cityIds)], name: cityName })
            return { id: cityIds[getRandomKey(cityIds)], name: cityName }
        }
        const data = await fetchWeatherData('/geo/v2/city/lookup', {
            location: cityName,
            number: 1
        });

        if (data.code !== '200' || !data.location || data.location.length === 0) {
            throw new Error('未找到匹配的城市');
        }

        return {
            id: data.location[0].id,
            name: data.location[0].name
        };
    } catch (error) {
        console.error(`[${config.PLUGIN_NAME}] 城市查询失败:`, error);
        throw new Error(`城市查询失败: ${error.message}`);
    }
}

// 获取天气数据
async function getWeather(locationId) {
    try {
        const [current, forecast] = await Promise.all([
            fetchWeatherData('/v7/weather/now', { location: locationId }),
            fetchWeatherData('/v7/weather/3d', { location: locationId })
        ]);

        if (current.code !== '200') throw new Error(`当前天气API错误: ${current.code}`);
        if (forecast.code !== '200') throw new Error(`天气预报API错误: ${forecast.code}`);

        return { current: current.now, forecast: forecast.daily };
    } catch (error) {
        console.error(`[${config.PLUGIN_NAME}] 天气查询失败:`, error);
        throw new Error(`天气查询失败: ${error.message}`);
    }
}

// 格式化天气信息
function formatWeather(name, current, forecast) {
    const nowInfo = `
🌤️ ${name}：当前天气: ${current.text}
🌡️ 温度: ${current.temp}℃ | 体感: ${current.feelsLike}℃
💨 ${current.windDir} ${current.windScale}级
💧 湿度: ${current.humidity}% | 能见度: ${current.vis}公里
🕒 更新时间: ${new Date(current.obsTime).toLocaleTimeString()}`;

    let forecastInfo = "\n\n📅 未来三天预报:\n";
    forecast.slice(0, 3).forEach(day => {
        forecastInfo += `\n📌 ${day.fxDate} ${day.textDay}
☀️ 温度: ${day.tempMin}~${day.tempMax}℃
🌙 夜间: ${day.textNight}`;
    });

    return nowInfo + forecastInfo;
}

function getRandomKey(obj) {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
}

module.exports = {
    weatherPlugin: {
        async init() {
            console.log(`[${config.PLUGIN_NAME}] 初始化完成`);
        },

        async main(msgType, msgContent, senderOpenid) {
            try {
                // 获取城市名称或使用默认
                const city = msgContent.trim() || '北京';

                // 获取LocationID
                const cityId = await getLocationId(city);

                // 获取天气数据
                const { current, forecast } = await getWeather(cityId.id);

                const result = formatWeather(cityId.name, current, forecast)

                console.log(result)
                // 格式化结果
                return result;

            } catch (error) {
                console.error(`[${config.PLUGIN_NAME}] 处理失败:`, error);
                return `⚠️ 天气查询失败: ${error.message}\n请检查城市名称或稍后重试`;
            }
        },

        async cleanup() {
            console.log(`[${config.PLUGIN_NAME}] 资源清理完成`);
        }
    }
};
