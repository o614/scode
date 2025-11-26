# WeChat Scan Unlock (微信扫码全自动解锁)

[![GitHub Repo stars](https://img.shields.io/github/stars/o614/wechat-scan-unlock?style=social)](https://github.com/o614/wechat-scan-unlock)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/o614/wechat-scan-unlock)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> 用「扫一下公众号二维码」的方式，给任意网页加一层“只有我能打开”的小门禁。  
> 基于 Vercel Serverless + Vercel KV (Redis)，前端轮询后端状态，实现 **扫码 → 发送验证码 → 网页自动解锁/跳转**。

---

## 🔗 Demo

- PC 访问：<https://scode-rose.vercel.app>

（记得在 `index.html` 里把二维码和跳转链接替换成你自己的，见下文 👇）

---

## ✨ 功能特点

- **零门槛**：支持个人订阅号，无需认证、无需服务号。
- **全自动**：用户只需要在公众号里发一串数字，网页端自动解锁/跳转，无需手动输入。
- **防白嫖**：
  - 验证码有有效期
  - 超时自动失效
  - 使用一次即销毁
- **零成本**：完整方案可跑在 Vercel Free Tier 上，不需要自备服务器。

---

## 🧠 工作原理（简要）

1. 用户打开网页 `index.html`，前端向后端请求一个 **随机验证码 + 会话标识**，并显示在页面上。
2. 用户用微信扫码关注公众号，在公众号里发送该验证码。
3. 微信服务器把这条消息转发到你的服务器（这里是 Vercel Serverless `/api/wechat` 接口）。
4. Serverless 校验验证码并写入 Vercel KV（Redis）中。
5. 前端使用 **长轮询 / 轮询接口**，不断查询当前会话是否已被“解锁”。
6. 一旦检测到解锁状态，前端自动执行 `window.location.href = '你的目标链接'`，完成跳转。

---

## 🚀 快速部署（Deploy to Vercel）

### 1. 准备

- 一个 GitHub 账号
- 一个 Vercel 账号
- 一个微信公众号（订阅号即可，个人号也行）

### 2. 一键部署

点击下面的按钮，Vercel 会自动帮你 Clone 本仓库并创建项目：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/o614/wechat-scan-unlock)

然后按以下步骤补全配置即可：

1. 在 Vercel 项目页面，打开 **Storage → Create Database → 选择 KV (Redis / Upstash)**  
   Vercel 会自动注入 `KV_URL` 等环境变量，无需手工复制。
2. 打开 **Settings → Environment Variables**，新增一个变量：
   - `WECHAT_TOKEN`：随便填一个字符串（比如 `my_secret_token_123`），用来给微信服务器做签名校验。
3. 触发一次重新部署（Redeploy），让环境变量生效。

---

## 🤖 公众号配置

在微信公众平台做一次服务器配置：

1. 进入「设置与开发 → 基本配置」。
2. 服务器配置填写：
   - **URL**：`https://你的项目域名.vercel.app/api/wechat`
   - **Token**：填你刚才在 Vercel 里设置的 `WECHAT_TOKEN`
   - **EncodingAESKey**：随便生成一个
   - **消息加解密方式**：选择「明文模式」
3. 点击「提交」，如果提示“提交成功”说明对接 OK。

---

## 🎨 前端页面配置（index.html）

打开仓库里的 `index.html`，根据需要改两处：

1. **公众号二维码**  
   搜索 `img src`，把占位图片地址替换为你自己的公众号二维码图片链接。

2. **跳转目标链接**  
   搜索 `window.location.href`，把里面的地址改成「想保护的资源链接」，比如：
   - 某个下载地址
   - 某篇私有文档
   - 某个活动报名页
   - 等等

---

## ⚙️ 前端配置项

在 `index.html` 里有一个简单的配置对象：

```js
const CONFIG = {
  apiBase: '/api/web',
  pollInterval: 3000, // 轮询间隔 (毫秒)，默认 3 秒
  timeout: 60,        // 验证码有效期，单位秒
  urgentTime: 15      // 剩余多少秒进入“红色紧急倒计时”
};

/
├── api/
│   ├── wechat.js      # 微信服务器回调接口，处理消息、校验签名
│   └── web.js         # 网页端接口：生成验证码、轮询状态等
├── index.html         # 前端页面（扫码 + 倒计时 + 自动跳转）
├── package.json       # 依赖与脚本
└── README.md          # 本说明文档
