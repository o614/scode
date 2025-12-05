const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const { Parser, Builder } = require('xml2js');

const TOKEN = process.env.WECHAT_TOKEN;
const parser = new Parser({ explicitArray: false, trim: true });
const builder = new Builder({ cdata: true, rootName: 'xml', headless: true });

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    const params = [TOKEN, timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(params.join('')).digest('hex');
    return hash === signature ? res.send(echostr) : res.status(401).send('Invalid Signature');
  }

  if (req.method === 'POST') {
    try {
      const rawBody = await getRawBody(req);
      const { xml: msg } = await parser.parseStringPromise(rawBody);
      const content = (msg.Content || '').trim();
      let replyText = '';

      if (/^\d{4}$/.test(content)) {
        const currentStatus = await kv.get(`login:${content}`);

        if (currentStatus === 'pending') {
          // 【优化】验证成功后，数据只保留 60秒，足够前端读取了，节省空间
          await kv.set(`login:${content}`, 'ok', { EX: 60 });
          replyText = "🟢 验证成功！网页已解锁";
        } else {
          replyText = "🔴 验证失败！请检查输入";
        }
      } else {
        return res.send('success');
      }

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



