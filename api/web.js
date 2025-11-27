// api/web.js
const { kv } = require('@vercel/kv');
const axios = require('axios');

module.exports = async (req, res) => {
  const { type, q, code } = req.query;

  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // --- 🦆 核心搜索逻辑 (DuckDuckGo 版本) ---
    if (type === 'search') {
      if (!q) return res.json({ status: 'error', msg: '请输入关键词' });

      // 1. 构造高级搜索指令 (Dorks)
      // 搜索词示例: "复仇者联盟 (site:pan.quark.cn OR site:aliyundrive.com OR site:pan.baidu.com)"
      const dorks = `${q} (site:pan.quark.cn OR site:aliyundrive.com OR site:pan.baidu.com)`;
      
      // 2. 请求 DuckDuckGo 轻量版 (html.duckduckgo.com)
      // 必须伪装 User-Agent，否则会被拦截
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorks)}`;
      
      const { data: html } = await axios.get(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      });

      // 3. 正则暴力解析 HTML (无需 cheerio，保持轻量)
      const results = [];
      // 匹配结果块: <div class="result ...">
      const regex = /<div class="result__body links_main links_deep">([\s\S]*?)<\/div><\/div>/g;
      const linkRegex = /class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/;
      const snippetRegex = /class="result__snippet" href="[^"]+">([\s\S]*?)<\/a>/;

      let match;
      while ((match = regex.exec(html)) !== null) {
        const block = match[1];
        
        // 提取链接和标题
        const linkMatch = block.match(linkRegex);
        const snippetMatch = block.match(snippetRegex);

        if (linkMatch) {
          let rawLink = linkMatch[1];
          const title = linkMatch[2].replace(/<[^>]+>/g, '').trim(); // 去掉 HTML 标签
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // DDG 链接解码 (从 ?uddg=... 中提取真实 URL)
          // 原始格式: //duckduckgo.com/l/?kh=-1&uddg=https%3A%2F%2Fpan.quark.cn%2Fs%2F...
          let realLink = rawLink;
          if (rawLink.includes('uddg=')) {
            try {
              const urlObj = new URL('https:' + rawLink);
              realLink = urlObj.searchParams.get('uddg');
            } catch (e) {}
          }

          // 识别网盘类型
          let driveType = 'unknown';
          if (realLink.includes('aliyundrive.com')) driveType = 'aliyun';
          else if (realLink.includes('quark.cn')) driveType = 'quark';
          else if (realLink.includes('baidu.com')) driveType = 'baidu';

          // 只添加有效结果
          if (driveType !== 'unknown') {
            results.push({
              title: title,
              link: realLink,
              snippet: snippet,
              type: driveType
            });
          }
        }
      }

      // 4. 返回结果
      if (results.length === 0) {
        return res.json({ status: 'success', data: [], msg: '未找到相关资源，请换个词试试' });
      }

      return res.json({ status: 'success', data: results });
    }

    // --- 🔐 验证相关逻辑 (保持不变) ---
    if (type === 'init') {
      if (!code) return res.json({ status: 'error', msg: '缺少验证码' });
      await kv.set(`login:${code}`, 'pending', { EX: 60 }); // 60s 有效
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

    return res.status(404).json({ status: 'error', msg: 'API Ready' });

  } catch (error) {
    console.error('Search Error:', error.message);
    return res.status(500).json({ status: 'error', msg: '搜索服务繁忙，请稍后再试' });
  }
};
