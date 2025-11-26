# WeChat Scan Unlock (微信扫码全自动解锁)

这是一个运行在 Serverless 环境（Vercel）上的「网页 + 公众号」小工具。
它可以给任意网页加上一层“只有我自己能打开”的扫码门禁：电脑端显示随机验证码，手机在公众号里发送同样的数字后，网页自动解锁 / 跳转，全程无需在页面上输入任何密码。

## ✨ 主要功能

* 一次性口令解锁：网页生成随机验证码，用户在公众号里发送后，页面自动解锁或跳转到目标链接。
* 零门槛：支持个人订阅号，无需认证、无需服务号。
* 防白嫖 & 防挂机：

  * 验证码有有效期，超时自动失效；
  * 一次使用后立即销毁。
* 零成本：整个方案可以跑在 Vercel Free Tier + Vercel KV 上，不需要自备服务器或 Redis。

适合用来保护：

* 下载链接、网盘地址
* 文档 / Notion 页面
* 活动报名页、表单
* 任何你想“稍微加一道门”的网页资源

## 🚀 Demo
https://private-user-images.githubusercontent.com/49578959/519102495-e4fe3a59-26a3-46e7-9eb0-997b6e597fc4.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjQxNDk5NTgsIm5iZiI6MTc2NDE0OTY1OCwicGF0aCI6Ii80OTU3ODk1OS81MTkxMDI0OTUtZTRmZTNhNTktMjZhMy00NmU3LTllYjAtOTk3YjZlNTk3ZmM0LmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjYlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTI2VDA5MzQxOFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTRhMDUxOTZhYTJlMzk2ZDBiOGE1M2U1N2FiMmM5Mzg4ZGE0ZjJhMTEwYWQ1NTBhYmNkMWJlODI4NGNlMDI2NjImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.RyPXAc6DjaANxuqZusCEIXLeQiukx0wgL2TJRccqZ2k

* 在线演示：[https://scode-rose.vercel.app](https://scode-rose.vercel.app)

> Demo 里只是示例逻辑，你可以在 `index.html` 中替换成自己的二维码和目标链接。

## 🧩 工作原理（简略）

1. 用户打开网页 `index.html`，前端向后端请求一个「会话 ID + 随机验证码」，并显示在页面上。
2. 用户用手机扫码关注公众号，在公众号里发送该验证码。
3. 微信服务器将消息推送到你的服务器（Vercel Serverless：`/api/wechat`）。
4. 后端校验验证码并在 Vercel KV 中记录「该会话已解锁」。
5. 前端通过 `/api/web` 轮询当前会话状态，一旦检测到已解锁，就执行页面跳转 `window.location.href = '你的目标链接'`。

---

## 🛠 部署指南 (Deploy)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/o614/wechat-scan-unlock)

本项目非常适合部署在 Vercel 上。

### 1. 准备工作

* 一个 GitHub 账号
* 一个 Vercel 账号
* 一个微信公众号（订阅号即可）

### 2. 部署到 Vercel

你可以手动导入项目，也可以 Fork 后再导入，这里以直接导入为例：

1. 在 Vercel 控制台点击 **“Add New…” → “Project”**。
2. 选择 **Import Git Repository**，填入本仓库地址：`https://github.com/o614/wechat-scan-unlock`。
3. 在项目创建完成后，进入 **Storage**：

   * 点击 **Create Database**；
   * 选择 **KV (Redis / Upstash)**。
   * Vercel 会自动注入 `KV_URL` 等相关环境变量，无需手动填写。
4. 打开 **Settings → Environment Variables**，新增环境变量：

   * `WECHAT_TOKEN`：自定义一个字符串（例如 `my_secret_token_123`），用于和微信服务器做签名校验。
5. 触发一次 **Redeploy**（重新部署），让环境变量和 KV 配置生效。

> 小结：Serverless 负责处理微信与网页的逻辑，KV 只负责存储「验证码→会话状态」，没有复杂持久化需求。

---

## 📲 配置微信公众号

1. 登录【微信公众平台】 → 「设置与开发」 → 「基本配置」。
2. 在「服务器配置」一栏点击 **修改配置**：

   * **URL**：`https://你的项目域名.vercel.app/api/wechat`
   * **Token**：填你在 Vercel 中设置的 `WECHAT_TOKEN`
   * **EncodingAESKey**：随机生成即可
   * **消息加解密方式**：选择「明文模式」
3. 点击 **提交**，如果提示“提交成功”，说明对接完成。

此时，你的公众号已经可以接收用户发来的验证码，并驱动网页解锁逻辑。

---

## 🎨 前端页面配置 (index.html)

打开根目录下的 `index.html`，需要改两处：

### 1. 公众号二维码图片

搜索 `img src`，把默认占位地址换成你自己的公众号二维码链接，例如：

```html
<img src="https://你的域名/your-wechat-qrcode.png" alt="公众号二维码" />
```

### 2. 解锁后跳转的目标链接

搜索 `window.location.href`，把里面的地址替换成你想保护的资源链接，例如：

```js
window.location.href = 'https://your-secret-link.example.com';
```

---

## ⚙️ 前端配置项 (index.html)

页面中的核心配置对象如下：

```js
const CONFIG = {
  apiBase: '/api/web',  // 前端调用的后端接口前缀
  pollInterval: 3000,   // 轮询间隔（毫秒），默认 3 秒
  timeout: 60,          // 验证码有效期（秒）
  urgentTime: 15        // 剩余多少秒开始进入“红色紧急倒计时”
};
```

你可以根据需求调整：

* 想更实时：把 `pollInterval` 调小，但请求会更频繁；
* 想给用户更久时间：提高 `timeout`；
* 想提前给压力：把 `urgentTime` 调大，比如 30 秒。

---

## 📁 项目结构

```text
/
├── api/
│   ├── wechat.js    # 处理微信服务器回调 (验证签名、接收消息、写入 KV)
│   └── web.js       # 提供给网页使用的接口 (生成验证码、轮询解锁状态)
├── index.html       # 前端页面：展示验证码、倒计时与自动跳转
├── package.json     # 项目依赖与脚本
└── README.md        # 项目说明文档
```

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=o614/wechat-scan-unlock\&type=Date)](https://star-history.com/#o614/wechat-scan-unlock&Date)

---

## About

网页 + 公众号 实现简单加密 / 扫码解锁的 Demo 项目。
适合用来给个人小工具、下载页、文档等资源加一层轻量的扫码门禁。

* Demo：[https://scode-rose.vercel.app](https://scode-rose.vercel.app)
* Repo：[https://github.com/o614/wechat-scan-unlock](https://github.com/o614/wechat-scan-unlock)
