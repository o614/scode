// api/web.js
const { kv } = require('@vercel/kv');
const axios = require('axios');

// 获取环境变量
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CSE_ID;

module.exports = async (req, res) => {
  const { type, q, code } = req.query;

  // 跨域设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // --- 🔍 搜索接口 (Google API 版) ---
    if (type === 'search') {
      if (!q) return res.json({ status: 'error', msg: '请输入关键词' });

      // 检查配置是否齐全
      if (!GOOGLE_KEY || !GOOGLE_CX) {
        return res.status(500).json({ status: 'error', msg: '服务端未配置 Google API' });
      }

      // 构造请求：只查前 10 条
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&num=10`;
      
      const response = await axios.get(url);
      const items = response.data.items || [];

      if (items.length === 0) {
        return res.json({ status: 'success', data: [], msg: '未找到相关资源' });
      }

      // 数据清洗：转换成前端需要的格式
      const results = items.map(item => {
        let driveType = 'unknown';
        const link = item.link || '';
        
        // 识别网盘类型
        if (link.includes('aliyundrive.com')) driveType = 'aliyun';
        else if (link.includes('quark.cn')) driveType = 'quark';
        else if (link.includes('baidu.com')) driveType = 'baidu';

        return {
          title: item.title,
          link: link,
          snippet: item.snippet,
          type: driveType
        };
      });

      return res.json({ status: 'success', data: results });
    }

    // --- 🔐 验证接口 (保持不变) ---
    if (type === 'init') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      await kv.set(`login:${code}`, 'pending', { EX: 60 });
      return res.json({ status: 'success' });
    }

    if (type === 'check') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      const status = await kv.get(`login:${code}`);
      
      if (status === 'ok') {
        await kv.del(`login:${code}`);
        // 生成一个随机 Token
        const token = 'VIP-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        return res.json({ status: 'success', token: token });
      } else {
        return res.json({ status: 'waiting' });
      }
    }

    return res.status(404).json({ status: 'error', msg: 'API Ready' });

  } catch (error) {
    // 捕获 Google API 的错误 (比如配额超限)
    console.error('API Error:', error.response ? error.response.data : error.message);
    
    // 如果是配额超限 (429/403)
    if (error.response && error.response.status === 429) {
      return res.status(500).json({ status: 'error', msg: '今日搜索次数已达上限，请明天再来' });
    }
    
    return res.status(500).json({ status: 'error', msg: '搜索服务繁忙，请稍后再试' });
  }
};
