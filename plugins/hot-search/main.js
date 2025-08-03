const https = require('https');
const config = require('./config');

module.exports = {
    hotSearchPlugin: {
        async main(msgType, msgContent) {
            if (config.PLATFORM_MAP[msgContent.trim()]) {
                msgContent = config.PLATFORM_MAP[msgContent.trim()]
            }
            try {
                // 处理平台列表请求
                if (!msgContent.trim()) {
                    return await this.handlePlatformList();
                }
                // 处理具体平台热搜请求
                return await this.handlePlatformHotSearch(msgContent.trim());
            } catch (error) {
                console.error('热搜插件错误:', error);
                return `处理热搜请求时出错: ${error.message}`;
            }
        },

        /**
         * 获取平台列表并生成图片
         */
        async handlePlatformList() {
            // const platforms = await this.fetchData('/all');

            // 生成Markdown表格
            const mdContent = this.generatePlatformTable();

            try {
                // 尝试生成图片
                const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                    imgOptions: config.IMAGE_CONFIG
                });

                return {
                    text: '📊 可用热搜平台列表',
                    image: imgBuffer
                };
            } catch (error) {
                // 图片生成超时退回文本
                if (error.message.includes('timeout')) {
                    return `🕒 图片生成超时，以下是文本格式:\n\n${mdContent}`;
                }
                throw error;
            }
        },

        /**
         * 获取具体平台热搜并生成图片
         * @param {string} platformName 平台名称
         */
        async handlePlatformHotSearch(platformName) {
            // 获取平台热搜数据
            const result = await this.fetchData(await this.findPlatformPath(platformName));

            // 生成Markdown内容
            const mdContent = this.generateHotSearchTable(result);

            try {
                // 尝试生成图片
                const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                    imgOptions: config.IMAGE_CONFIG
                });

                return {
                    text: `🔥 ${result.title} 热搜榜`,
                    image: imgBuffer
                };
            } catch (error) {
                // 图片生成超时退回文本
                if (error.message.includes('timeout')) {
                    return `🕒 图片生成超时，以下是文本格式:\n\n${mdContent}`;
                }
                throw error;
            }
        },

        /**
         * 根据平台名称查找平台路径
         * @param {string} platformName 平台名称
         */
        async findPlatformPath(platformName) {
            const { routes } = await this.fetchData('/all');

            // 查找匹配的平台
            const platform = routes.find(p =>
                p.name.toLowerCase() === platformName.toLowerCase() ||
                p.path.toLowerCase() === `/${platformName.toLowerCase()}`
            );

            if (!platform) {
                throw new Error(`未找到平台: ${platformName}`);
            }

            return platform.path;
        },

        /**
         * 生成平台列表的Markdown
         */
        generatePlatformTable() {
            const columns = config.TABLE_CONFIG.columns;
            let table = '# 📊 常用热搜平台列表\n\n';

            for (key in config.PLATFORM_MAP) {
                table += `- ${key}\n`
            }

            return table;
        },

        /**
         * 生成热搜榜单的Markdown表格
         * @param {Object} result 热搜数据
         */
        generateHotSearchTable(result) {
            const maxItems = config.TABLE_CONFIG.maxItems;
            const items = result.data.slice(0, maxItems);

            let table = `# 🔥 ${result.title} 热搜榜\n\n`;
            table += `**更新时间**: ${new Date(result.updateTime).toLocaleString()}\n\n`;
            table += `| 排名 | 标题 | 热度 |\n`;
            table += `|------|------|------|\n`;

            items.forEach((item, index) => {
                const title = item.title.length > 20 ?
                    `${item.title.substring(0, 17)}...` : item.title;
                table += `| ${index + 1} | ${title} | ${this.formatHotValue(item.hot)} |\n`;
            });

            return table;
        },

        /**
         * 格式化热度值
         * @param {number} value 原始热度值
         */
        formatHotValue(value) {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value;
        },

        /**
         * 发送HTTP请求获取数据
         * @param {string} path 请求路径
         */
        fetchData(path) {
            return new Promise((resolve, reject) => {
                const url = `${config.BASE_URL}${path}`;

                https.get(url, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            if (result.code !== 200) {
                                reject(new Error(`API错误: ${result.message || '未知错误'}`));
                            } else {
                                resolve(result);
                            }
                        } catch (error) {
                            reject(new Error('解析API响应失败'));
                        }
                    });
                }).on('error', (error) => {
                    reject(new Error(`请求失败: ${error.message}`));
                });
            });
        }
    }
};
