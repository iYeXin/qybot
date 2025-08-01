# 使用轩辕镜像源的Node.js运行时作为基础镜像
FROM docker.xuanyuan.me/node:18-slim

# 设置工作目录
WORKDIR /app

# 安装Chrome浏览器（用于图片生成功能）
RUN apt-get update && apt-get install -y wget gnupg && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装项目依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建插件目录（如果不存在）
RUN mkdir -p ./plugins

# 暴露端口（如果需要）
EXPOSE 3000

# 设置环境变量
ENV CHROME_PATH=/usr/bin/google-chrome

# 启动机器人
CMD ["npm", "start"]