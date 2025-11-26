const crypto = require('crypto');

const SECRET = process.env.API_SECRET || 'test_secret_123';

// 这里存放你的“机密数据”
const TOP_SECRET_DATA = {
  title: "🚀 核发射代码",
  content: "Alpha-Bravo-Charlie-9921",
  note: "恭喜你！这证明了验证系统坚不可摧。"
};

module.exports = (req, res) => {
  const { challenge, code } = req.query;

  if (!challenge || !code) {
    return res.status(400).json({ success: false, msg: '参数缺失' });
  }

  // 后端重算一遍签名
  const expected = crypto.createHmac('sha256', SECRET)
    .update(challenge)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase();

  // 比较前端传来的 code 和后端算的 expected 是否一致
  if (code.toUpperCase() === expected) {
    // ✅ 验证通过，返回机密数据
    res.status(200).json({ success: true, secret: TOP_SECRET_DATA });
  } else {
    // ❌ 验证失败
    res.status(401).json({ success: false, msg: '密码错误，别想蒙混过关！' });
  }
};