const axios = require('axios');
const { botConfig } = require('./app')

// 创建 Axios 实例并配置拦截器
const service = axios.create({
	timeout: 60000,
});

// 请求拦截器
service.interceptors.request.use(config => {
	if (config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		const formData = new URLSearchParams();
		for (const key in config.data) {
			formData.append(key, config.data[key]);
		}
		config.data = formData;
	}

	// 避免二次序列化
	if (typeof config.data === 'string') {
		try {
			config.data = JSON.parse(config.data);
		} catch (e) {
			// 解析失败保持原样
		}
	}

	return config;
}, error => Promise.reject(error));

// 响应拦截器
service.interceptors.response.use(
	response => response.data,
	error => Promise.reject(error)
);

// 获取 accessToken
module.exports.getAccessToken = () => service({
	url: 'https://bots.qq.com/app/getAppAccessToken',
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	data: {
		appId: botConfig.appId,
		clientSecret: botConfig.secret
	}
});

// 获取 ws 链接
module.exports.getWsLink = (accessToken) => service({
	url: `https://${botConfig.sandBox ? 'sandbox.' : ''}api.sgroup.qq.com/gateway`,
	method: 'GET',
	headers: {
		Authorization: `QQBot ${accessToken}`
	},
	params: { language: "zh" }
});

// 发送消息
module.exports.botSendMessage = (accessToken, msg, id, group_id) => service({
	url: `https://api.sgroup.qq.com/v2/groups/${group_id}/messages`,
	method: 'POST',
	headers: {
		Authorization: `QQBot ${accessToken}`
	},
	data: {
		content: msg,
		msg_type: 0,
		msg_id: id
	}
});
