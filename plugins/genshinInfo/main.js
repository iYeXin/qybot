const fs = require('fs');
const path = require('path');

module.exports = {
    genshinPlugin: {
        // 缓存数据
        quotes: [],
        arms: [],
        holyRelics: [],
        characters: [],

        async init() {
            try {
                const pluginDir = __dirname;

                // 加载数据文件
                this.quotes = JSON.parse(fs.readFileSync(path.join(pluginDir, 'quotes.json'), 'utf8'));
                this.arms = JSON.parse(fs.readFileSync(path.join(pluginDir, 'arms.json'), 'utf8'));
                this.holyRelics = JSON.parse(fs.readFileSync(path.join(pluginDir, 'holyRelics.json'), 'utf8'));
                this.characters = JSON.parse(fs.readFileSync(path.join(pluginDir, 'characters.json'), 'utf8'));

                console.log('原神插件数据加载完成');
            } catch (error) {
                console.error('原神插件初始化失败:', error);
            }
        },

        async main(msgType, msgContent) {
            try {
                switch (msgType) {
                    case '原神语录':
                        return this.handleQuotes(msgContent);
                    case '原神武器':
                        return this.handleArms(msgContent);
                    case '原神圣遗物':
                        return this.handleHolyRelics(msgContent);
                    case '原神角色':
                        return this.handleCharacters(msgContent, false);
                    case '原神角色故事':
                        return this.handleCharacters(msgContent, true);
                    default:
                        return '未知指令，请使用以下有效指令：\n原神语录/原神武器/原神圣遗物/原神角色/原神角色故事';
                }
            } catch (error) {
                console.error('原神插件处理错误:', error);
                return '处理请求时出错，请稍后再试';
            }
        },

        // 处理语录请求
        handleQuotes(characterName) {
            let candidateQuotes = this.quotes;

            if (characterName) {
                candidateQuotes = this.quotes.filter(
                    quote => quote.author.includes(characterName)
                );
            }

            if (candidateQuotes.length === 0) {
                candidateQuotes = this.quotes;
            }

            const randomQuote = candidateQuotes[Math.floor(Math.random() * candidateQuotes.length)];
            return `【${randomQuote.author}】\n${randomQuote.content}`;
        },

        // 处理武器请求
        async handleArms(weaponName) {
            let candidateWeapons = this.arms;

            if (weaponName) {
                candidateWeapons = this.arms.filter(
                    weapon => weapon.name.includes(weaponName)
                );
            }

            if (candidateWeapons.length === 0) {
                candidateWeapons = this.arms;
            }

            const weapon = candidateWeapons[Math.floor(Math.random() * candidateWeapons.length)];

            // 构建Markdown内容
            const mdContent = `
# ${weapon.name}

**类型**: ${weapon.type}

**简介**: ${weapon.profile}

**标签**: ${weapon.TAG.join('、')}
      `;

            // 生成图片
            const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                imgOptions: {
                    width: 500,
                    quality: 90
                }
            });

            return {
                text: `武器：${weapon.name}`,
                image: imgBuffer
            };
        },

        // 处理圣遗物请求
        async handleHolyRelics(relicName) {
            let candidateRelics = this.holyRelics;

            if (relicName) {
                candidateRelics = this.holyRelics.filter(
                    relic => relic.name.includes(relicName)
                );
            }

            if (candidateRelics.length === 0) {
                candidateRelics = this.holyRelics;
            }

            const relic = candidateRelics[Math.floor(Math.random() * candidateRelics.length)];

            // 构建Markdown内容
            let mdContent = `# ${relic.name}\n\n`;
            mdContent += `**标签**: ${relic.TAG.join('、')}\n\n`;
            mdContent += '## 故事\n';

            relic.story.forEach((story, index) => {
                mdContent += `${index + 1}. ${story}\n\n`;
            });

            // 生成图片
            const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                imgOptions: {
                    width: 600,
                    quality: 90,
                    waitFor: 1000 // 等待1秒确保渲染完成
                }
            });

            return {
                text: `圣遗物：${relic.name}`,
                image: imgBuffer
            };
        },

        // 处理角色请求
        async handleCharacters(characterName, showStories) {
            let candidateCharacters = this.characters;

            // 模糊匹配角色名
            if (characterName) {
                candidateCharacters = this.characters.filter(
                    char =>
                        char.Name.includes(characterName) ||
                        char.Fullname.includes(characterName) ||
                        (char.Nicknames && char.Nicknames.some(nick => nick.includes(characterName)))
                );
            }

            if (candidateCharacters.length === 0) {
                candidateCharacters = this.characters;
            }

            const character = candidateCharacters[Math.floor(Math.random() * candidateCharacters.length)];

            if (showStories) {
                return this.generateCharacterStories(character);
            }

            return this.generateCharacterInfo(character);
        },

        // 生成角色信息图片
        async generateCharacterInfo(char) {
            // 构建Markdown内容
            let mdContent = `
# ${char.Name} · ${char.Designation}

${char.Photos && char.Photos[1] ? `![${char.Name}](${char.Photos[1]})` : ''}

### 全名: ${char.Fullname}
### 生日: ${char.Birthday}
### 武器: ${char.Weapon}
### 星级: ${'★'.repeat(parseInt(char.Star))}
### 元素: ${char.Vision}
### 命之座: ${char.Constellation}
### 实装时间: ${char.ActualInstallationTime}
### 职业: ${char.Job || '无'}
### 昵称: ${char.Nicknames ? char.Nicknames.join('、') : '无'}

### 描述: ${char.Description}

### 标签: ${char.TAG.join('、')}
      `;

            // 生成图片
            const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                imgOptions: {
                    width: 600,
                    quality: 90,
                    waitFor: 2000 // 等待2秒确保图片加载
                }
            });

            return {
                text: `角色：${char.Name}`,
                image: imgBuffer
            };
        },

        // 生成角色故事图片
        async generateCharacterStories(char) {
            // 构建Markdown内容
            let mdContent = `# ${char.Name} · 角色故事\n\n`;

            // 处理编号故事
            for (let i = 1; i <= 5; i++) {
                if (char.Stories[i.toString()]) {
                    mdContent += `### ${char.Stories[i.toString()]}\n\n`;
                }
            }

            // 处理特殊故事
            const specialStories = ['Pron', 'Things', 'Vision'];
            specialStories.forEach(key => {
                if (char.Stories[key]) {
                    mdContent += `## ${this.getStoryTitle(key)}\n\n${char.Stories[key]}\n\n`;
                }
            });

            // 生成图片
            const imgBuffer = await this.ctx.utils.md2img(mdContent, {
                imgOptions: {
                    width: 700,
                    quality: 90,
                    waitFor: 1000 // 等待1秒确保渲染完成
                }
            });

            return {
                text: `${char.Name}的角色故事`,
                image: imgBuffer
            };
        },

        // 获取故事标题
        getStoryTitle(key) {
            const titles = {
                'Pron': '角色语音',
                'Things': '相关物品',
                'Vision': '神之眼'
            };
            return titles[key] || key;
        }
    }
};