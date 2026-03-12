---
name: cloudflare-git-deploy
description: 透過 Git 管理並更新部署在 Cloudflare Pages 上的專案。包含檢查狀態、修改程式碼、解決衝突、推送並驗證線上結果的完整流程。適用於「兔兔助理 (lonlontwo-gpt)」專案。
---

# 🚀 Cloudflare Pages Git 部署技能

## 專案基本資訊

| 項目 | 內容 |
|------|------|
| **本地路徑** | `d:\網站內架設GPT` |
| **GitHub Repo** | `https://github.com/lonlontwo/lonlontwo-gpt.git` |
| **分支** | `main` |
| **線上前台** | `https://lonlontwo-gpt.pages.dev/` |
| **線上後台** | `https://lonlontwo-gpt.pages.dev/admin.html` |
| **部署平台** | Cloudflare Pages（連動 GitHub，push 後自動部署） |

---

## 📋 標準更新流程

### Step 1：確認目前 Git 狀態
```powershell
git status
git log --oneline -5
git remote -v
```
- 確認本地分支是否落後遠端
- 若有差異，**先確認遠端有哪些新 commit**

### Step 2：同步遠端最新版本（重要！）
```powershell
git fetch origin
git log --oneline origin/main -5
```
> ⚠️ 若本地落後遠端很多，建議直接 reset 再做修改：
```powershell
git reset --hard origin/main
```

### Step 3：進行程式碼修改
- 使用編輯工具修改對應檔案
- 常見修改位置：
  - `index.html` → UI 結構
  - `style.css` → 樣式
  - `script.js` → 前端邏輯
  - `functions/api/chat.js` → Cloudflare Worker 後端

### Step 4：Commit 並推送
```powershell
git add <檔案名稱>
git commit -m "feat/fix/style: 描述修改內容"
git push origin main
```

### Step 5：驗證線上結果
```powershell
# 確認線上 HTML 已更新
curl -s "https://lonlontwo-gpt.pages.dev/" | Select-String -Pattern "關鍵字"
```
- Cloudflare Pages 接收到 push 後約 **1~2 分鐘** 完成部署
- 若使用者看到舊頁面，請使用 `Ctrl + Shift + R` 強制重新整理（清除瀏覽器快取）

---

## ⚠️ 常見問題與解法

### 問題：push 被拒絕（rejected）
```
! [rejected] main -> main (fetch first)
```
**原因**：遠端有本地沒有的 commit（另一個地方有推過）  
**解法**：
```powershell
git fetch origin
git reset --hard origin/main   # 放棄本地，以遠端為主
# 重新套用你的修改後再 commit + push
```

### 問題：rebase 產生衝突
```
CONFLICT (content): Merge conflict in script.js
```
**解法**：
```powershell
git rebase --abort              # 先取消 rebase
git reset --hard origin/main   # 以遠端為基準重置
# 重新修改後再 commit + push
```

### 問題：線上頁面沒有更新
- **原因一**：Cloudflare 還在部署中（等 1~2 分鐘）
- **原因二**：瀏覽器快取
  - Chrome/Edge：`Ctrl + Shift + R`
  - 或開無痕視窗確認
- **驗證方式**：用 `curl` 直接抓取線上 HTML 原始碼確認

---

## 📁 專案檔案架構

```
d:\網站內架設GPT\
├── index.html              ← 前端主頁（聊天介面）
├── style.css               ← 樣式（主題色、RWD）
├── script.js               ← 前端邏輯（Firebase 同步、訊息處理）
├── admin.html              ← 後台管理介面（深色橘色風格）
├── bunny-launcher.js       ← 嵌入式懸浮小工具（可貼到任意網站）
├── bunny-avatar.png        ← 兔兔頭像
├── DOCUMENTATION.md        ← 開發紀錄文件
└── functions/
    └── api/
        └── chat.js         ← Cloudflare Worker（API 代理 + RAG 知識庫）
```

---

## 🔒 安全注意事項

- **所有 API Key** 存放在 Firebase Firestore，Worker 動態讀取，前端不暴露 ✅
- **Firebase API Key** 在 `bunny-launcher.js` 中是公開的（這是 Firebase 設計，安全性靠 Firebase 安全規則控制）
- **Firebase Project ID**：`green-tract-416604`
- **不可將任何 API Key 硬編碼進任何前端檔案**

---

## 🤖 多模型支援架構（2026-03-12 新增）

### 支援的模型商

| 模型商 | 欄位名稱 | 預設模型 | Fallback 模型 | 費用 |
|--------|----------|----------|---------------|------|
| **Groq** | `groqApiKey` | `llama-3.3-70b-versatile` | llama-3.1-8b-instant / gemma2-9b-it | 免費 |
| **Google Gemini** | `geminiApiKey` | `gemini-2.0-flash` | gemini-flash-latest / gemini-2.0-flash-lite | 免費額度 |
| **Cloudflare AI** | *(不需要)* | `@cf/meta/llama-3.1-8b-instruct` | `@cf/mistral/mistral-7b-instruct-v0.1` | 完全免費 |

### Firebase Firestore 欄位結構

```
configs/bunny-assistant:
  activeProvider:  "groq"        ← 目前使用的模型商（預設 groq）
  userModels:      "groq,cloudflare" ← 開放前台切換的模型清單
  groqApiKey:      "gsk_..."     ← Groq Key
  geminiApiKey:    ""            ← Gemini Key（空著沒問題，前台會有錯誤提示）
  botName:         "兔兔助理"
  prompt:          "..."
  chips:           "..."
  color:           "#ff8fb1"
  avatarUrl:       "..."
  knowledgeUrls:   "..."
  keyExpiryDate:   "2026/12/31"
```

### Worker 路由邏輯

```
Firebase 讀取 activeProvider
  → "groq"       → api.groq.com/...                     + groqApiKey
  → "gemini"     → generativelanguage.../               + geminiApiKey
  → "cloudflare" → context.env.AI.run (Cloudflare 環境) + *(無金鑰，透過後台綁定大寫 AI)*
```

> ⚠️ 若選擇的模型商 Key 為空，Worker 回傳明確錯誤訊息，不影響其他模型商

### 後台切換方式

1. 前往 `https://lonlontwo-gpt.pages.dev/admin.html`
2. 點「API 金鑰」分頁
3. 在「🤖 使用模型商」下拉選擇目標模型商
4. 填入對應的 API Key
5. 點「儲存所有變更」→ 立刻生效，無需重新部署

---

## 📝 操作紀錄

### 2026-03-12 第一次（移除標題按鈕）

**任務**：移除前台聊天視窗標題欄的「最大化」與「關閉」兩個按鈕  
**修改檔案**：
- `index.html`：刪除 `<div class="header-actions">` 整個區塊
- `style.css`：刪除 `.header-actions` 與 `.control-btn` 樣式規則

**處理過程**：
1. 遠端 (`origin/main`) 比本地新很多（有 HuggingFace 整合等新 commit）
2. 以 `git reset --hard origin/main` 同步最新遠端
3. 重新套用只移除按鈕的最小化修改
4. `git push` 成功，Cloudflare 自動部署

**Commit**：`9df5829 feat: 移除標題欄最大化與關閉按鈕`

---

### 2026-03-12 第二次（多模型支援）

**任務**：後台新增 Gemini / DeepSeek / OpenAI 模型商的 Key 填入機制，Worker 依設定動態路由  
**修改檔案**：
- `functions/api/chat.js`：重構為多模型路由架構，依 `activeProvider` 切換 API 端點與 Key
- `admin.html`：API 金鑰分頁新增模型商下拉選單、各平台 Key 輸入欄位與說明連結

**注意事項**：
- `git reset --hard` 後務必確認本地檔案已包含修改，再執行 `git add`
- 推送前用 `git diff HEAD <filename>` 或 `Get-Item` 確認檔案大小有變化
- `admin.html` 同一次作業中被 reset 覆蓋，需重新套用修改才能正確 commit

**Commits**：
- `3379b0d feat: 後台支援多模型商切換 (chat.js)`
- `83585b6 feat: 後台 API 金鑰分頁增加 Gemini/DeepSeek/OpenAI 模型商選擇與金鑰欄位`

---

### 2026-03-12 第三次（多模型擴充與修正）

**任務**：移除需付費/需本機環境的 OpenAI 搭配 DeepSeek，改加完全免費的 Cloudflare Workers AI，並修正 Gemini 找不到模型及限速處理。
**修改內容**：
- 前後台移除了對 OpenAI 及 DeepSeek 的相關實作（HTML、JS UI）。
- `functions/api/chat.js` 新增了 `cloudflare` 路由，使用 Cloudflare 的 `@cf/meta/llama-3.1-8b-instruct` 模型，呼叫方式改為 `context.env.AI.run(...)`。
- 修改 `chat.js` 針對 Gemini `v1beta` endpoint，並解決 1.5 系列的報錯：全面棄用 `gemini-1.5` 指定，改使用實際支援的 `gemini-2.0-flash`、`gemini-flash-latest`、`gemini-2.0-flash-lite`。
- 新增 Cloudflare 綁定 (Binding) 偵測：給予 `typeof context.env.AI.run !== 'function'` 明確的新手除錯訊息（引導至 Functions > AI 綁定中增加環境變數 `AI`）。
- 優化了 Gemini 發生額度 (`quota`) 超限或 (`Rate limit`) 的前端錯誤顯示。

**注意事項**：
- **Cloudflare AI 免費但不需 Key，唯需於 Cloudflare Pages 後台 [Functions] 設定 [AI Bindings]，變數必須命名為 `AI`（且非在環境變數區設定純文字）**。
- Gemini 在連續呼叫時非常容易超過 1 分鐘免費 15 次的限速額度或 `limit: 0` (針對 2.0)，程式會疊加錯誤訊息給使用者過約 1 分鐘重試即可。

**Commits**：
- `5c3300f fix: Gemini 改用帳號實際有的模型 gemini-2.0-flash，移除不存在的 1.5 版本`
- `40ecfef feat: 移除 DeepSeek 和 OpenAI，新增完全免費的 Cloudflare Workers AI`
- `0ed4ba3 fix: 增加 Cloudflare AI 綁定類型偵測，給予更明確的錯誤提示`

