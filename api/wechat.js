// api/wechat.js
const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const { Parser, Builder } = require('xml2js');

// 环境变量
const TOKEN = process.env.WECHAT_TOKEN;

const parser = new Parser({ explicitArray: false, trim: true });
const builder = new Builder({ cdata: true, rootName: 'xml', headless: true });

module.exports = async (req, res) => {
  // 1. 微信服务器配置验证 (GET)
  if (req.method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const params = [TOKEN, timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(params.join('')).digest('hex');
    return hash === signature ? res.send(echostr) : res.status(401).send('Invalid Signature');
  }

  // 2. 业务逻辑处理 (POST)
  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const { xml: msg } = await parser.parseStringPromise(rawBody);
      const content = (msg.Content || '').trim();
      let replyText = '';

      // --- 核心逻辑：全自动验证 (修复版) ---
      if (/^\d{4}$/.test(content)) {
        // 1. 先去 Redis 查一下，这个数字有没有网页在“占座” (pending)
        const currentStatus = await kv.get(`login:${content}`);

        if (currentStatus === 'pending') {
          // 2. 查到了！说明确实有网页在等这个数。修改状态为 'ok'
          // KEEPTTL: true 表示保留剩余过期时间，不重置倒计时
          await kv.set(`login:${content}`, 'ok', { KEEPTTL: true });
          
          replyText = "✅ 验证成功！\n\n网页正在自动解锁，请查看电脑/平板屏幕。";
        } else {
          // 3. 没查到 (说明用户输错了，或者验证码已过期)
          replyText = "❌ 验证码无效或已过期。\n\n请检查网页上显示的数字是否正确。";
        }
      } else {
        // 不是 4 位数字，保持沉默
        return res.send('success');
      }
      // -----------------------------------

      // 如果有回复内容，发送 XML
      if (replyText) {
        const xml = builder.buildObject({
          ToUserName: msg.FromUserName,
          FromUserName: msg.ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: replyText
        });
        res.setHeader('Content-Type', 'application/xml');
        return res.send(xml);
      } 
      
      return res.send('success');

    } catch (e) {
      console.error('WeChat Error:', e);
      return res.send('success'); 
    }
  }
};

function getRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });
}
