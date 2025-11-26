const crypto = require('crypto');
const { Parser, Builder } = require('xml2js');

// 必须在 Vercel 环境变量里设置这两项
const TOKEN = process.env.WECHAT_TOKEN;
const SECRET = process.env.API_SECRET || 'test_secret_123';

const parser = new Parser({ explicitArray: false, trim: true });
const builder = new Builder({ cdata: true, rootName: 'xml', headless: true });

module.exports = async (req, res) => {
  // 1. 微信服务器验证 (GET请求)
  if (req.method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const params = [TOKEN, timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(params.join('')).digest('hex');
    return hash === signature ? res.send(echostr) : res.send('error');
  }

  // 2. 处理用户消息 (POST请求)
  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const { xml: msg } = await parser.parseStringPromise(rawBody);
      const content = (msg.Content || '').trim();

      let replyText = '请发送网页上的 4 位数字验证码。';

      // 核心逻辑：如果是 4 位数字，计算 HMAC 签名
      if (/^\d{4}$/.test(content)) {
        const unlockCode = crypto.createHmac('sha256', SECRET)
          .update(content)
          .digest('hex')
          .substring(0, 6)
          .toUpperCase();
        
        replyText = `🔑 您的解锁密码是：\n${unlockCode}\n\n(请在网页输入此密码)`;
      }

      // 返回微信 XML
      const xml = builder.buildObject({
        ToUserName: msg.FromUserName,
        FromUserName: msg.ToUserName,
        CreateTime: Math.floor(Date.now() / 1000),
        MsgType: 'text',
        Content: replyText
      });
      res.setHeader('Content-Type', 'application/xml');
      return res.send(xml);

    } catch (e) {
      console.error(e);
      return res.send('');
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