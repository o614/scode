// api/wechat.js
const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const { Parser, Builder } = require('xml2js');

const TOKEN = process.env.WECHAT_TOKEN;

const parser = new Parser({ explicitArray: false, trim: true });
const builder = new Builder({ cdata: true, rootName: 'xml', headless: true });

module.exports = async (req, res) => {
  // 1. 微信服务器验证 (GET)
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
      
      let replyText = ''; // 默认不回复任何内容

      // --- 核心逻辑 ---
      // 只有匹配 4 位数字时，才处理并回复
      if (/^\d{4}$/.test(content)) {
        // 写入 Redis
        await kv.set(`login:${content}`, 'ok', { EX: 300 });
        
        replyText = "✅ 验证成功！\n\n网页解锁中...";
      }
      // ----------------

      // 如果有需要回复的内容，才发送 XML
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
      } else {
        // 如果没有匹配到指令，直接返回 success (微信要求的“保持沉默”信号)
        return res.send('success');
      }

    } catch (e) {
      console.error('WeChat Error:', e);
      return res.send('success'); // 出错也保持沉默，防止报错刷屏
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
