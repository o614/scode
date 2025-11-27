const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { type, code } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    if (type === 'init') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      
      // 【优化】有效期改为 60秒 (配合前端倒计时)
      await kv.set(`login:${code}`, 'pending', { EX: 60 });
      
      return res.json({ status: 'success' });
    }

    if (type === 'check') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });

      const status = await kv.get(`login:${code}`);

      if (status === 'ok') {
        await kv.del(`login:${code}`);
        const token = 'VIP-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        return res.json({ status: 'success', token: token });
      } else {
        return res.json({ status: 'waiting' });
      }
    }

    return res.status(404).json({ status: 'error', msg: '未知指令' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', msg: '服务器繁忙' });
  }
};
