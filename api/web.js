// api/web.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { type, code } = req.query;

  // 允许跨域 (方便你把网页部署在任何地方，不仅是 Vercel)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // 轮询接口
    if (type === 'check') {
      if (!code) return res.json({ status: 'error', msg: '缺少参数' });

      // 查询 Redis 状态
      const status = await kv.get(`login:${code}`);

      if (status === 'ok') {
        // 查到了！验证通过
        
        // 1. 立即删除 Key (防止“蹭车”，一次性使用)
        await kv.del(`login:${code}`);

        // 2. 生成一个 Token (这里简单模拟，实际可用 JWT)
        const token = 'VIP-' + Date.now().toString(36) + Math.random().toString(36).substr(2);

        return res.json({ status: 'success', token: token });
      } else {
        // 还没扫码
        return res.json({ status: 'waiting' });
      }
    }

    // 这里可以扩展其他需要 Token 才能访问的接口
    // if (type === 'get_resource') { ... }

    return res.status(404).json({ status: 'error', msg: '未知指令' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ status: 'error', msg: '服务器繁忙' });
  }
};
