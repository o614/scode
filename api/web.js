// api/web.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { type, code } = req.query;

  // 跨域设置 & JSON 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // --- 1. 初始化验证 (生成验证码占位) ---
    if (type === 'init') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      // 设置状态为 pending，有效期 60 秒
      await kv.set(`login:${code}`, 'pending', { EX: 60 });
      return res.json({ status: 'success' });
    }

    // --- 2. 轮询检查状态 ---
    if (type === 'check') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      const status = await kv.get(`login:${code}`);
      
      if (status === 'ok') {
        // 验证成功，删除 KV 键值，防止重复使用
        await kv.del(`login:${code}`);
        // 生成一个随机 Token (用于前端缓存)
        const token = 'UNLOCK-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        return res.json({ status: 'success', token: token });
      } else {
        return res.json({ status: 'waiting' });
      }
    }

    return res.status(404).json({ status: 'error', msg: 'API Ready (Lock Mode)' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', msg: '服务繁忙' });
  }
};
