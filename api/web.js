// api/web.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { type, code } = req.query;

  // 允许跨域，方便调试
  res.setHeader('Access-Control-Allow-Origin', '*');

  // --- 核心逻辑：检查登录状态 ---
  if (type === 'check_login') {
    if (!code) return res.json({ status: 'waiting' });

    try {
      // 去数据库查这个码
      const isValid = await kv.get(`login:${code}`);

      if (isValid) {
        // 查到了！说明用户在微信里发送了这个数字
        // 立即删除该码（防止重复使用）
        await kv.del(`login:${code}`);
        
        // 返回成功信号
        return res.json({ status: 'success' });
      } else {
        // 没查到，继续等
        return res.json({ status: 'waiting' });
      }
    } catch (e) {
      console.error(e);
      return res.json({ status: 'error' });
    }
  }

  // 如果有其他功能，写在下面...
  return res.json({ message: 'API Working' });
};
