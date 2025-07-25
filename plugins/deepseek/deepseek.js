const https = require('https');

class DeepSeekAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    chat(model, content) {
        return new Promise((resolve, reject) => {
            const requestData = JSON.stringify({
                messages: [
                    { role: "system", content: "You are a helpful assistant" },
                    { role: "user", content: content }
                ],
                model: model,
                stream: false
            });

            const options = {
                hostname: 'api.deepseek.com',
                path: '/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(requestData)
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);

                        if (res.statusCode >= 400) {
                            const errorMessage = response.error?.message || 'Unknown API error';
                            reject(new Error(`API Error (${res.statusCode}): ${errorMessage}`));
                        } else if (response.choices?.length > 0) {
                            resolve(response.choices[0].message.content);
                        } else {
                            reject(new Error('No response content found'));
                        }
                    } catch (parseError) {
                        reject(new Error(`Response parse error: ${parseError.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(requestData);
            req.end();
        });
    }

    getBalance() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.deepseek.com',
                path: '/user/balance',
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);

                        if (res.statusCode >= 400) {
                            const errorMessage = response.error?.message || 'Unknown API error';
                            reject(new Error(`Balance API Error (${res.statusCode}): ${errorMessage}`));
                        } else {
                            resolve(response);
                        }
                    } catch (parseError) {
                        reject(new Error(`Balance response parse error: ${parseError.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }
}

module.exports = DeepSeekAPI;
