const fs = require('fs');
const path = require('path');

// 缓存文件路径
const CACHE_PATH = path.join(__dirname, 'cache.json');

// 凌晨时间判定函数
const isSameDay = (timestamp) => {
  const now = new Date();
  const target = new Date(timestamp);
  return now.getFullYear() === target.getFullYear() &&
         now.getMonth() === target.getMonth() &&
         now.getDate() === target.getDate();
};

// 将评论库提升至模块作用域
const LUCK_COMMENTS = {
   0: '系统都懒得给你编数据',
   1: '呼吸权被剥夺水平',
   2: '倒霉得很有层次感',
   3: '三生不幸集于今日',
   4: '四舍五入等于没有',
   5: '五体投地式倒霉',
   6: '六神无主式水逆',
   7: '七窍生烟级运气',
   8: '八辈子的霉运',
   9: '九死一生体验卡',
   10: '水逆见了都自愧不如',
   11: '十一分的努力零分运气',
   12: '本命年提前到来',
   13: '十三点式倒霉',
   14: '十四行诗都写不出你的惨',
   15: '十五的月亮十六圆，你的霉运天天全',
   16: '十六进制都算不出你的背',
   17: '十七层地狱观光客',
   18: '十八罗汉都救不了',
   19: '十九年有期徒刑级霉运',
   20: '倒霉得很有创意哦',
   21: '二一添作五，倒霉不分主',
   22: '双双把家还的倒霉劲',
   23: '尔散三连击',
   24: '爱死不死级运气',
   25: '五五开的倒霉概率',
   26: '二六顺的倒霉运',
   27: '二期工程烂尾楼',
   28: '二八定律倒霉版',
   29: '二九感冒灵式水逆',
   30: '平平无奇倒霉蛋',
   31: '三一三十一，水逆永第一',
   32: '三长两短体验版',
   33: '散装倒霉三三制',
   34: '三生四世倒霉不断',
   35: '三五成群式水逆',
   35: '三五成群的倒霉鬼',
   36: '三六九等最下层',
   37: '三七开之霉运当头',
   38: '三八线级倒霉',
   39: '三九严寒式背运',
   40: '勉强能活水平',
   41: '四舍五入等于没活',
   42: '生命、宇宙及一切的答案也就这样',
   43: '死三回都不够的背',
   44: '死死团荣誉会员',
   45: '四舍五入等于没分',
   45: '四舍五入等于没分',
   46: '四六不懂的倒霉劲',
   47: '四七二十八难',
   48: '四平八稳倒霉版',
   49: '四九城里最背的人',
   50: '中庸得让人心疼',
   50: '中庸得让人心疼',
   51: '五一劳动节还在倒霉',
   52: '五二共识：永远背运',
   53: '五三模拟考级倒霉',
   54: '五四青年节式水逆',
   55: '五十步笑百步水平',
   56: '五六大顺倒霉版',
   57: '五七干校级运气',
   58: '五八同城最背用户',
   59: '五九式倒霉永动机',
   60: '小确丧本丧',
   61: '六一儿童节式幼稚倒霉',
   62: '六二式水逆永动机',
   63: '六三惨案级运气',
   64: '六四开霉运套餐',
   65: '六成倒霉三成水逆',
   66: '魔鬼的步伐666',
   67: '六七大顺倒霉版',
   68: '六八同城最背用户',
   67: '六七大顺倒霉版',
   68: '六八同城最背用户',
   69: '六九式倒霉永动机',
   70: '运气好得有点可疑',
   71: '七成努力三成玄学',
   72: '七二开好运体验卡',
   73: '七成努力三成水逆',
   74: '七四事变级倒霉',
   75: '七五计划倒霉版',
   76: '七上八下式忐忑',
   77: '七七事变级水逆',
   78: '七成八作倒霉鬼',
   79: '七九河开霉运来',
   80: '欧皇体验卡到账',
   81: '八成一败涂地',
   82: '八二法则倒霉版',
   83: '八三折的运气',
   84: '八四消毒液都救不了',
   85: '八成是人品透支',
   86: '八六式水逆漂移',
   87: '八七成倒霉概率',
   88: '发发？我看是罚罚',
   89: '八九不离十的背运',
   90: '锦鲤本鲤出现了',
   91: '九一三事件级倒霉',
   92: '九二共识：永远好运',
   93: '九三学社倒霉分会',
   94: '差6分完美？故意的吧',
   95: '九五之尊体验版',
   96: '九六式水逆',
   97: '差三分完美？故意的吧',
   98: '这运气...充钱了吧？',
   99: '后台程序员的小号',
   100: '建议检查系统漏洞'
};

function getComment(value) {
  return LUCK_COMMENTS[value] || '这结果...懂的都懂';
}

module.exports = {
  dailyLuckPlugin: {
    async init() {
      try {
        if (!fs.existsSync(CACHE_PATH) || fs.readFileSync(CACHE_PATH).toString().trim() === '') {
          fs.writeFileSync(CACHE_PATH, JSON.stringify({}));
        }
      } catch (e) {
        console.error('[缓存初始化失败]', e);
        fs.writeFileSync(CACHE_PATH, JSON.stringify({}));
      }
    },

    async main(msgType, msg, senderOpenid) {
        let cache = {};
        try {
            cache = JSON.parse(fs.readFileSync(CACHE_PATH));
        } catch (e) {
            console.error('[缓存读取失败]', e);
            cache = {};
        }
    
        // 新增删除缓存指令处理
        if (msg && msg.includes('删除缓存')) {
            if (cache[senderOpenid]) {
                delete cache[senderOpenid];
                fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
                return '已清除您今日的运势缓存';
            }
            return '您当前没有可清除的缓存记录';
        }

        const currentTime = Date.now();
  
        // 清理过期缓存
        Object.keys(cache).forEach(openid => {
          if (!isSameDay(cache[openid].timestamp)) {
            delete cache[openid];
          }
        });
  
        // 判断缓存有效性
        if (cache[senderOpenid] && isSameDay(cache[senderOpenid].timestamp)) {
          return `\n你今天的人品是：${cache[senderOpenid].value}\n${getComment(cache[senderOpenid].value)}`;
        }
  
        // 生成新结果
        const newValue = Math.floor(Math.random() * 101);
        cache[senderOpenid] = {
          value: newValue,
          timestamp: currentTime
        };
  
        // 更新缓存
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        return `\n你今天的人品是：${newValue}\n${getComment(newValue)}`;
      },
      catch (error) {
      console.error('Error in dailyLuckPlugin:', error);
      return '今天的人品计算出错了，请稍后重试。';
    }
  }
};