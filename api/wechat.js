// api/wechat.js
const { kv } = require('@vercel/kv'); // 引入数据库
const crypto = require('crypto');
const { Parser, Builder } = require('xml2js');

const WECHAT_TOKEN = process.env.WECHAT_TOKEN;
const parser = new Parser({ explicitArray: false, trim: true });
const builder = new Builder({ cdata: true, rootName: 'xml', headless: true });

module.exports = async (req, res) => {
  // GET 验证逻辑保持不变
  if (req.method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const params = [WECHAT_TOKEN || '', timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(params.join('')).digest('hex');
    return hash === signature ? res.send(echostr) : res.send('error');
  }

  // POST 消息处理
  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const { xml: msg } = await parser.parseStringPromise(rawBody);
      const content = (msg.Content || '').trim();
      
      let replyText = '请发送网页上的 4 位验证码。';

      // --- 核心逻辑：全自动验证 ---
      // 如果收到的是 4 位数字 (例如 8848)
      if (/^\d{4}$/.test(content)) {
        // 存入 Redis：Key="login:8848", Value="1", 5分钟过期
        await kv.set(`login:${content}`, '1', { EX: 300 });
        
        replyText = "✅ 验证成功！\n\n您的网页即将自动跳转，无需任何操作。";
      }
      // -------------------------

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
