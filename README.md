# WeChat Scan Unlock (微信扫码全自动解锁) 🔓

这是一个基于 **Vercel Serverless + Vercel KV (Redis)** 的轻量级方案。它允许用户在网页上获取随机验证码，通过微信公众号发送该数字后，网页端**全自动解锁/跳转**，无需用户手动输入密码。

🚀 **特点**：
* **零门槛**：支持个人订阅号（无需认证，无需服务号）。
* **全自动**：利用 Long Polling (长轮询) 机制，手机发送，电脑秒开。
* **防白嫖**：验证码有效期、防挂机、阅后即焚机制。
* **零成本**：基于 Vercel Free Tier 即可完美运行。

## 🛠 部署指南

### 1. 准备工作
* 一个 GitHub 账号
* 一个 Vercel 账号
* 一个微信公众号（订阅号即可）

### 2. 部署到 Vercel
1. **Fork** 本仓库到你的 GitHub。
2. 在 Vercel 中 **Import** 你的仓库。
3. **关键步骤**：在 Vercel 项目页面，点击 **Storage** -> **Create Database** -> 选择 **KV (Redis)** (Upstash)。
   * *Vercel 会自动添加 `KV_URL` 等环境变量，无需手动复制。*
4. 去 **Settings** -> **Environment Variables**，添加一个新的变量：
   * Key: `WECHAT_TOKEN`
   * Value: 自定义一个字符串（例如 `my_secret_token_123`），用于微信后台验证。
5. **Redeploy** (重新部署) 以让环境变量生效。

### 3. 配置公众号
1. 进入微信公众平台 -> **设置与开发** -> **基本配置**。
2. 修改配置：
   * **URL**: `https://你的域名.vercel.app/api/wechat`
   * **Token**: 填入你在 Vercel 设置的那个 `WECHAT_TOKEN`。
   * **EncodingAESKey**: 随机生成即可。
   * **消息加解密方式**: 明文模式。
3. 点击提交，显示“提交成功”即完成。

### 4. 替换素材 (index.html)
打开 `index.html`，找到以下两处进行修改：
1. **二维码图片**：搜索 `img src`，将占位图片换成你的公众号二维码链接。
2. **跳转链接**：搜索 `window.location.href`，将目标网址换成你想要加密的资源链接。

## ⚙️ 配置项 (index.html)

```javascript
const CONFIG = {
  apiBase: '/api/web', 
  pollInterval: 3000, // 轮询间隔 (3秒)
  timeout: 60,        // 验证码有效期 (60秒)
  urgentTime: 15      // 最后15秒进入红色紧急状态
};
