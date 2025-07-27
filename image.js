const https = require('https');
const http = require('http');
const url = require('url');
const { botConfig } = require('./app')

// 检测图片MIME类型（支持JPEG/PNG）
function detectMimeType(buffer) {
    const header = buffer.slice(0, 8);
    const jpegHeader = Buffer.from([0xFF, 0xD8]);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    if (header.slice(0, 2).equals(jpegHeader)) return 'image/jpeg';
    if (header.equals(pngHeader)) return 'image/png';
    throw new Error('Unsupported image format. Only JPEG/PNG allowed');
}

module.exports = function img2Url(buffer, serviceUrl = botConfig.imageServer) {
    return new Promise((resolve, reject) => {
        // 检测图片类型
        let mimeType;
        try {
            mimeType = detectMimeType(buffer);
        } catch (err) {
            return reject(err);
        }

        // 解析服务URL
        let parsedUrl;
        try {
            parsedUrl = new url.URL(serviceUrl);
        } catch (err) {
            return reject(new Error(`Invalid service URL: ${serviceUrl}`));
        }

        // 根据协议选择http/https模块
        const protocolModule = parsedUrl.protocol === 'https:' ? https : http;

        // 配置上传选项
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': mimeType,
                'Content-Length': buffer.length
            }
        };

        // 创建请求
        const req = protocolModule.request(options, (res) => {
            let responseData = Buffer.alloc(0);

            res.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);
            });

            res.on('end', () => {
                // 处理非200状态码
                if (res.statusCode !== 200) {
                    const errorBody = responseData.toString().slice(0, 100);
                    return reject(new Error(`Upload failed with status ${res.statusCode}: ${errorBody}`));
                }

                // 尝试解析JSON响应
                try {
                    const jsonResponse = JSON.parse(responseData.toString());
                    if (jsonResponse.url) {
                        resolve(jsonResponse.url);
                    } else {
                        reject(new Error('Invalid response: Missing URL field'));
                    }
                } catch (err) {
                    reject(new Error(`Failed to parse server response: ${responseData.toString().slice(0, 100)}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Network error: ${err.message}`));
        });

        // 设置请求超时（10秒）
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timed out after 10 seconds'));
        });

        // 发送图片数据
        req.write(buffer);
        req.end();
    });
};