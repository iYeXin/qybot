// main.js
const fs = require('fs');
const path = require('path');
const questionsData = require('./yavt_0_1_0.json');
const modelData = require('./yavt-5-axis.json');

// 读取Chart.js库内容并转换为Data URL
const chartJsPath = path.join(__dirname, 'chart.js');
const chartJsContent = fs.readFileSync(chartJsPath, 'utf8');
const chartJsDataURL = `data:application/javascript;base64,${Buffer.from(chartJsContent).toString('base64')}`;

module.exports = {
  ideologyTestPlugin: {
    async init() {
      this.dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir);
      }
      console.log('意识形态测试插件已初始化');
    },

    async main(msgType, msgContent, senderOpenid) {
      try {
        const userFile = path.join(this.dataDir, `${senderOpenid}.json`);

        // 处理带斜杠的指令格式
        const isDirectAnswer = true;
        const normalizedType = isDirectAnswer ? "意识形态" : msgType;
        const normalizedContent = isDirectAnswer ? msgContent : msgContent;

        if (normalizedType.startsWith('/')) normalizedType = normalizedType.slice(1)
        if (normalizedType !== "意识形态") {
          return "指令格式错误，请使用 '@bot 意识形态' 或 '@bot /意识形态'";
        }

        if (normalizedContent.trim().toLowerCase() === '中止') {
          if (fs.existsSync(userFile)) fs.unlinkSync(userFile);
          return '测试已中止，进度已清除';
        }

        let userData = this.getUserData(userFile);

        if (normalizedContent.trim() === '') {
          return this.getQuestions(userData, userFile);
        }

        return this.processAnswers(normalizedContent, userData, userFile, senderOpenid);

      } catch (error) {
        console.error('处理错误:', error);
        return `处理出错: ${error.message}`;
      }
    },

    getUserData(userFile) {
      if (fs.existsSync(userFile)) {
        return JSON.parse(fs.readFileSync(userFile, 'utf8'));
      }

      const allQuestionIds = questionsData.questions.map(q => q.id);
      return {
        answered: [],
        remaining: [...allQuestionIds],
        currentBatch: []
      };
    },

    async getQuestions(userData, userFile) {
      // 1. 检查当前批次是否已有题目
      if (userData.currentBatch && userData.currentBatch.length > 0) {
        return this.buildQuestionsResponse(userData);
      }

      // 2. 检查是否已完成所有问题
      if (userData.remaining.length === 0) {
        return '您已完成所有问题，请等待结果计算';
      }

      // 3. 生成新批次
      const count = Math.min(5, userData.remaining.length);
      userData.currentBatch = [];

      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * userData.remaining.length);
        const questionId = userData.remaining.splice(randomIndex, 1)[0];
        userData.currentBatch.push(questionId);
      }

      // 4. 保存用户数据
      fs.writeFileSync(userFile, JSON.stringify(userData));

      // 5. 构建响应
      return this.buildQuestionsResponse(userData);
    },

    // 构建Markdown格式的问题并转为图片
    async buildQuestionsResponse(userData) {
      // 构建Markdown内容
      let markdown = `# 📝 意识形态测试 (第${Math.floor(userData.answered.length / 5) + 1}批)\n\n`;
      markdown += `**剩余问题:** ${userData.remaining.length + userData.currentBatch.length}\n\n`;
      markdown += "---\n\n";

      userData.currentBatch.forEach((id, index) => {
        const question = questionsData.questions.find(q => q.id === id);
        markdown += `${index + 1}. ${question.text}\n\n`;
      });

      markdown += "---\n\n";
      markdown += "**请回复一组数字(-2到2)，用空格分隔，分别代表:**\n\n";
      markdown += "- `-2`: 强烈反对\n";
      markdown += "- `-1`: 反对\n";
      markdown += "- `0`: 中立\n";
      markdown += "- `1`: 支持\n";
      markdown += "- `2`: 强烈支持\n\n";
      markdown += "**示例:** `0 -1 2 1 -2`\n\n";
      markdown += "> 输入\"中止\"可结束测试\n";
      markdown += "> 数据加密处理，仅用于生成分析报告";

      // 将Markdown转换为图片
      try {
        const imgBuffer = await this.ctx.utils.md2img(markdown, {
          imgOptions: {
            width: 450,
            transparent: false,
            waitFor: 500,
          }
        });

        return {
          text: "请查看图片中的问题并回复答案\n格式示例: `0 -1 2 1 -2`",
          image: imgBuffer
        };
      } catch (error) {
        console.error('生成问题图片失败:', error);
        // 图片生成失败时回退到文本
        return `生成问题图片失败，请重试\n${this.buildTextResponse(userData)}`;
      }
    },

    // 图片生成失败时的文本回退
    buildTextResponse(userData) {
      let response = `📝 意识形态测试 (第${Math.floor(userData.answered.length / 5) + 1}批)\n`;
      response += `剩余问题: ${userData.remaining.length + userData.currentBatch.length}\n\n`;

      userData.currentBatch.forEach((id, index) => {
        const question = questionsData.questions.find(q => q.id === id);
        response += `${index + 1}. ${question.text}\n`;
      });

      response += '\n请回复一组数字(-2到2)，用空格分隔，分别代表：\n';
      response += '-2:强烈反对  -1:反对  0:中立  1:支持  2:强烈支持\n';
      response += '例如: 0 -1 2 1 -2\n';
      response += '输入"中止"可结束测试';

      return response;
    },

    async processAnswers(input, userData, userFile, senderOpenid) {
      // 1. 在开头添加当前批次是否为空的检查
      if (!userData.currentBatch || userData.currentBatch.length === 0) {
        return '当前没有待回答的问题！请先发送空消息获取题目';
      }

      // 2. 验证答案格式
      const answers = input.trim().split(/\s+/).map(Number);
      if (answers.length !== userData.currentBatch.length ||
        answers.some(a => isNaN(a) || a < -2 || a > 2)) {
        return '输入格式错误！请提供一组-2到2之间的整数，用空格分隔';
      }

      // 3. 保存答案
      userData.currentBatch.forEach((id, index) => {
        userData.answered.push({ id, answer: answers[index] });
      });

      userData.currentBatch = [];

      // 4. 检查是否完成测试
      if (userData.remaining.length === 0) {
        const result = this.calculateResults(userData);
        if (fs.existsSync(userFile)) fs.unlinkSync(userFile);

        const htmlContent = this.generateRadarChart(result);


        // 修正：添加 await 关键字
        const imageBuffer = await this.ctx.utils.html2img(htmlContent, {
          width: 720,
          // height: 600,
          fullPage: true,
          transparent: false,
          waitFor: 1000 // 确保图表渲染完成
        });

        return {
          text: `测试完成！\n您的意识形态最接近: ${result.closestIdeology}\n` +
            `各维度得分:\n` +
            result.dimensionScores.map((score, i) =>
              `${modelData.dimensions[i]}: ${score}%`).join('\n'),
          image: imageBuffer
        };
      }

      // 5. 保存进度并返回下一批问题
      fs.writeFileSync(userFile, JSON.stringify(userData));
      return this.getQuestions(userData, userFile);
    },

    calculateResults(userData) {
      const dimensionScores = new Array(5).fill(0);
      const maxPossibleScores = new Array(5).fill(0); // 重命名为更准确

      userData.answered.forEach(item => {
        const question = questionsData.questions.find(q => q.id === item.id);
        question.evaluation.forEach((weight, dim) => {
          // 用户答案范围：-2到2
          dimensionScores[dim] += item.answer * weight;

          // 修正：最大可能得分 = |权重| * 2（因为用户答案最大绝对值为2）
          maxPossibleScores[dim] += Math.abs(weight) * 2;
        });
      });

      // 归一化计算（确保在0-100%范围内）
      const normalizedScores = dimensionScores.map((score, i) => {
        // 将原始得分映射到0-100%范围
        const normalized = (score + maxPossibleScores[i]) / (2 * maxPossibleScores[i]);
        return Math.min(100, Math.max(0, Math.round(normalized * 100)));
      });


      let minDistance = Infinity;
      let closestIdeology = '';

      Object.entries(modelData.ideologies).forEach(([name, scores]) => {
        const distance = normalizedScores.reduce((sum, score, i) => {
          return sum + Math.pow(score - scores[i], 2);
        }, 0);

        if (distance < minDistance) {
          minDistance = distance;
          closestIdeology = name;
        }
      });

      return {
        dimensionScores: normalizedScores,
        closestIdeology
      };
    },

    // 使用Data URL注入Chart.js
    generateRadarChart(result) {
      const dimensions = modelData.dimensions;
      const scores = result.dimensionScores;
      const explanations = modelData.explanations;

      // 定义每个维度的倾向标签
      const dimensionLabels = [
        { low: "市场", high: "计划" },
        { low: "国家", high: "世界" },
        { low: "权威", high: "自由" },
        { low: "守成", high: "进步" },
        { low: "发展", high: "环保" }
      ];

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="${chartJsDataURL}"></script>
  <style>
    body {
      background: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 20px;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
    }
    .container {
      width: 700px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.08);
      padding: 25px;
      box-sizing: border-box;
      position: absolute;
      top: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    .title {
      font-size: 26px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .ideology {
      font-size: 22px;
      color: #3498db;
      font-weight: 600;
      margin-bottom: 15px;
      background: #f1f8ff;
      padding: 10px;
      border-radius: 8px;
    }
    .chart-container {
      position: relative;
      height: 480px;
      margin: 0 auto;
    }
    .legend {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 25px;
      gap: 15px;
    }
    .dimension {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      width: 140px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      border: 1px solid #eaeaea;
    }
    .dimension-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
      font-size: 16px;
    }
    .dimension-score {
      font-size: 22px;
      font-weight: 700;
      color: #2980b9;
      margin: 10px 0;
    }
    .dimension-tendency {
      font-size: 14px;
      color: #7f8c8d;
      padding: 6px 10px;
      border-radius: 15px;
      background: #f1f8ff;
      display: inline-block;
      margin-top: 5px;
    }
    .tendency-low {
      background: #e8f5e9;
      color: #388e3c;
    }
    .tendency-high {
      background: #ffebee;
      color: #d32f2f;
    }
    .tendency-neutral {
      background: #e3f2fd;
      color: #1976d2;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #7f8c8d;
      font-size: 14px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">意识形态五维分析图</div>
      <div class="ideology">最接近的意识形态: ${result.closestIdeology}</div>
    </div>
    
    <div class="chart-container">
      <canvas id="radarChart"></canvas>
    </div>
    
    <div class="legend">
      ${dimensions.map((dim, i) => {
        const score = scores[i];
        let tendencyClass = 'tendency-neutral';
        let tendencyText = '中立';

        if (score < 40) {
          tendencyClass = 'tendency-low';
          tendencyText = `偏向${dimensionLabels[i].low}`;
        } else if (score > 60) {
          tendencyClass = 'tendency-high';
          tendencyText = `偏向${dimensionLabels[i].high}`;
        }

        return `
        <div class="dimension">
          <div class="dimension-name">${dim}</div>
          <div class="dimension-score">${score}%</div>
          <div class="dimension-tendency ${tendencyClass}">${tendencyText}</div>
        </div>
        `;
      }).join('')}
    </div>
    
    <div class="footer">
      问题来自YAVT 0.1.0 | 数据仅供学习测试使用<br>
      YAVT: https://hzx0910.github.io/yavt.fengtao.xyz/ 
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const ctx = document.getElementById('radarChart').getContext('2d');
      
      // 创建雷达图
      new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ${JSON.stringify((function () {
        let result = []
        dimensions.forEach(item => {
          result.push(item.split('-')[0])
        })
        return result
      }()))},
          datasets: [{
            label: '您的得分',
            data: ${JSON.stringify(scores)},
            fill: true,
            backgroundColor: 'rgba(52, 152, 219, 0.25)',
            borderColor: 'rgba(52, 152, 219, 0.8)',
            pointBackgroundColor: 'rgba(52, 152, 219, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(52, 152, 219, 1)',
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.raw + '%';
                },
                afterLabel: function(context) {
                  const index = context.dataIndex;
                  const score = context.dataset.data[index];
                  if (score < 40) {
                    return '偏向${dimensionLabels[0].low}';
                  } else if (score > 60) {
                    return '偏向${dimensionLabels[0].high}';
                  }
                  return '中立';
                }
              }
            }
          },
          scales: {
            r: {
              angleLines: {
                color: 'rgba(200, 200, 200, 0.5)'
              },
              grid: {
                color: 'rgba(200, 200, 200, 0.3)'
              },
              pointLabels: {
                font: {
                  size: 14,
                  weight: 'bold'
                },
                color: '#34495e'
              },
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                stepSize: 20,
                backdropColor: 'transparent',
                color: '#7f8c8d',
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    });
  </script>
</body>
</html>`;
    }
  }
};
