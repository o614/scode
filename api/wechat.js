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

      // --- 核心逻辑：全自动验证 ---
      // 匹配 4 位纯数字
      if (/^\d{4}$/.test(content)) {
        // 写入 Redis: Key="login:1234", Value="ok", 过期=300秒(5分钟)
        // 这里的过期时间要比前端超时时间长一点，留出余量
        await kv.set(`login:${content}`, 'ok', { EX: 300 });
        
        replyText = "✅ 验证成功！\n\n网页正在自动解锁，请查看电脑/平板屏幕。";
      } else {
        // 默认回复引导语
        replyText = "请发送网页上显示的 4 位数字验证码。";
      }
      // -------------------------

      // 构建 XML 回复
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
      console.error('WeChat Error:', e);
      return res.send('success'); // 报错也要返回 success 避免微信重试
    }
  }
};

// 辅助函数：读取流数据
function getRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });
}
