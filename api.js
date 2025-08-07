const axios = require('axios');
const { botConfig } = require('./app');

// 创建 Axios 实例
const service = axios.create({
	timeout: 60000,
	validateStatus: status => status >= 200 && status < 500 // 接受400-499状态码
});

// 请求拦截器：处理数据格式
service.interceptors.request.use(config => {
	// 处理表单编码数据
	if (config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		config.data = new URLSearchParams(config.data).toString();
	}

	// 处理JSON数据（自动序列化）
	if (config.headers['Content-Type'] === 'application/json' &&
		typeof config.data === 'object') {
		config.data = JSON.stringify(config.data);
	}

	return config;
}, error => {
	// 统一错误处理
	console.error('Request Error:', error);
	return Promise.reject(new Error(`请求配置错误: ${error.message}`));
});

// 响应拦截器：统一处理响应
service.interceptors.response.use(
	response => {
		// 处理非200状态码
		if (response.status >= 400) {
			const errorMsg = `请求失败: ${response.status} ${response.statusText}`;
			const errorData = response.data ? JSON.stringify(response.data) : '无响应数据';
			return Promise.reject(new Error(`${errorMsg} | ${errorData}`));
		}
		return response.data;
	},
	error => {
		// 增强错误信息
		let errorMessage = '网络请求异常';
		if (error.response) {
			errorMessage = `服务响应异常: ${error.response.status}`;
		} else if (error.request) {
			errorMessage = '无服务响应';
		}
		console.error('Response Error:', errorMessage, error);
		return Promise.reject(new Error(`${errorMessage} | ${error.message}`));
	}
);

/**
 * 基础请求方法（内部使用）
 * @param {Object} config 请求配置
 * @returns {Promise} 请求结果
 */
const makeRequest = (config) => {
	// 添加默认JSON头
	if (!config.headers) config.headers = {};
	if (!config.headers['Content-Type']) {
		config.headers['Content-Type'] = 'application/json';
	}
	return service(config);
};

/**
 * 获取 accessToken
 * @returns {Promise} 包含accessToken的Promise
 */
module.exports.getAccessToken = () => makeRequest({
	url: 'https://bots.qq.com/app/getAppAccessToken',
	method: 'POST',
	data: {
		appId: botConfig.appId,
		clientSecret: botConfig.secret
	}
});

/**
 * 上传群聊图片
 * @param {string} accessToken 访问令牌
 * @param {string} imgUrl 图片URL
 * @param {string} groupId 群组ID
 * @returns {Promise} 上传结果
 */
module.exports.uploadImage = (accessToken, imgUrl, groupId) => {
	if (!groupId) throw new Error('缺少必要的groupId参数');

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/groups/${groupId}/files`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data: {
			file_type: 1,
			url: imgUrl,
			srv_send_msg: false
		}
	});
};

/**
 * 获取WebSocket链接
 * @param {string} accessToken 访问令牌
 * @returns {Promise} 包含WS链接的Promise
 */
module.exports.getWsLink = (accessToken) => makeRequest({
	url: `https://${botConfig.sandBox ? 'sandbox.' : ''}api.sgroup.qq.com/gateway`,
	method: 'GET',
	headers: {
		Authorization: `QQBot ${accessToken}`
	},
	params: { language: "zh" }
});

/**
 * 发送群聊消息
 * @param {string} accessToken 访问令牌
 * @param {string} content 消息内容
 * @param {string} messageId 消息ID
 * @param {string} groupId 群组ID
 * @returns {Promise} 发送结果
 */
module.exports.botSendMessage = (accessToken, content, messageId, groupId) => {
	if (!groupId) throw new Error('缺少必要的groupId参数');

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/groups/${groupId}/messages`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data: {
			content,
			msg_type: 0,
			msg_id: messageId
		}
	});
};

/**
 * 发送带图片的群聊消息
 * @param {string} accessToken 访问令牌
 * @param {string} content 消息内容
 * @param {Object|null} imgFileinfo 图片信息
 * @param {string} messageId 消息ID
 * @param {string} groupId 群组ID
 * @returns {Promise} 发送结果
 */
module.exports.botSendImageMessage = (accessToken, content, imgFileinfo, messageId, groupId) => {
	if (!groupId) throw new Error('缺少必要的groupId参数');

	const data = imgFileinfo
		? { content, msg_type: 7, msg_id: messageId, media: imgFileinfo }
		: { content, msg_type: 0, msg_id: messageId };

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/groups/${groupId}/messages`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data
	});
};

/**
 * 上传私聊图片
 * @param {string} accessToken 访问令牌
 * @param {string} imgUrl 图片URL
 * @param {string} openid 用户ID
 * @returns {Promise} 上传结果
 */
module.exports.uploadImageForPrivate = (accessToken, imgUrl, openid) => {
	if (!openid) throw new Error('缺少必要的openid参数');

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/users/${openid}/files`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data: {
			file_type: 1,
			url: imgUrl,
			srv_send_msg: false
		}
	});
};

/**
 * 发送私聊消息
 * @param {string} accessToken 访问令牌
 * @param {string} content 消息内容
 * @param {string} messageId 消息ID
 * @param {string} openid 用户ID
 * @returns {Promise} 发送结果
 */
module.exports.sendPrivateMessage = (accessToken, content, messageId, openid) => {
	if (!openid) throw new Error('缺少必要的openid参数');

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/users/${openid}/messages`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data: {
			content,
			msg_type: 0,
			msg_id: messageId
		}
	});
};

/**
 * 发送带图片的私聊消息
 * @param {string} accessToken 访问令牌
 * @param {string} content 消息内容
 * @param {Object|null} imgFileinfo 图片信息
 * @param {string} messageId 消息ID
 * @param {string} openid 用户ID
 * @returns {Promise} 发送结果
 */
module.exports.sendPrivateImageMessage = (accessToken, content, imgFileinfo, messageId, openid) => {
	if (!openid) throw new Error('缺少必要的openid参数');

	const data = imgFileinfo
		? { content, msg_type: 7, msg_id: messageId, media: imgFileinfo }
		: { content, msg_type: 0, msg_id: messageId };

	return makeRequest({
		url: `https://api.sgroup.qq.com/v2/users/${openid}/messages`,
		method: 'POST',
		headers: {
			Authorization: `QQBot ${accessToken}`
		},
		data
	});
};