// api/web.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { type, code } = req.query;

  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // 【新增】初始化接口：网页端生成数字后，先来这里“占座”
    if (type === 'init') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      
      // 存入 Redis，状态设为 'pending' (等待中)
      // 有效期设为 120秒 (与前端超时时间一致)
      await kv.set(`login:${code}`, 'pending', { EX: 120 });
      
      return res.json({ status: 'success' });
    }

    // 轮询接口：检查状态
    if (type === 'check') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });

      // 查询 Redis 状态
      const status = await kv.get(`login:${code}`);

      if (status === 'ok') {
        // 验证成功！
        // 1. 立即删除 Key (阅后即焚，防止重复使用)
        await kv.del(`login:${code}`);

        // 2. 生成 Token (模拟)
        const token = 'VIP-' + Date.now().toString(36) + Math.random().toString(36).substr(2);

        return res.json({ status: 'success', token: token });
      } else {
        // 只要状态不是 'ok' (可能是 'pending' 或 null)，都算等待中
        return res.json({ status: 'waiting' });
      }
    }

    return res.status(404).json({ status: 'error', msg: '未知指令' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', msg: '服务器繁忙' });
  }
};
