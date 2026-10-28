# 練起來｜個人化健身 APP（網頁 + 手機）

依性別與目標個人化的健身 APP：先產生個人計畫，再用「跟練 + 飲食紀錄 + 日曆追蹤」形成每天的使用循環。
規格來源：Notion「健身APP / APP系統架構」。

> 「練起來」是暫定名稱，改名只要改 `index.html` 的 `<title>` 與 `public/manifest.webmanifest`。

## 一套程式碼，網頁與手機都能用

- **網頁**：放在 GitHub Pages，免費、推送程式碼就自動更新。
- **手機**：做成 PWA。用手機瀏覽器打開網址 →「加入主畫面」，就會像 APP 一樣全螢幕開啟、有圖示、可離線開啟。
- **之後要上架 App Store / Google Play**：用 Capacitor 把同一份程式包成 iOS／Android APP，不用重寫（見 `docs/ARCHITECTURE.md`）。

## 上傳到 GitHub 並發布（第一次）

1. 在 GitHub 建立新的 repository（例如 `fitness-app`），先不要勾選加入 README。
2. 在這個資料夾執行：
   ```bash
   git remote add origin https://github.com/<你的帳號>/fitness-app.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
4. 到 **Actions** 分頁等綠勾勾（約 1–2 分鐘），網址會是 `https://<你的帳號>.github.io/fitness-app/`。

之後每次 `git push`，網站都會自動重新建置與發布。

## 在自己電腦上開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev      # 開發模式，打開 http://localhost:5173
npm test         # 單元測試（熱量公式、菜單推薦規則）
npm run build    # 建置正式版到 dist/
```

手機實機測試：`npm run dev -- --host`，手機與電腦連同一個 Wi-Fi，打開終端機顯示的區網網址。

## 目前完成（第一階段 MVP 骨架）

| 模組 | 狀態 |
|---|---|
| 一、初次設定（性別、目標、類型、程度器材、習慣） | ✅ 可用，含計畫預覽頁 |
| 二、身體資料與計算（BMI、BMR、TDEE、建議熱量、蛋白質、喝水、安全規則） | ✅ 可用，有測試 |
| 三、日曆（月曆標示、當日詳情、身體紀錄、週報、生理期預估） | ✅ 基本版 |
| 三、飲食紀錄（搜尋、常吃／最近、手動輸入、熱量環） | ✅ 基本版；拍照與條碼為第二階段 |
| 四、食譜建議／一週菜單 | ⏳ 第二階段（已留位置） |
| 五、動作圖庫（Notion 三個資料庫 48 個動作）、菜單推薦、跟練模式 | ✅ 可用；48 個示範影片由 Notion 同步下載 |
| 飲食拍照貼紙（拍照 → 圓形貼紙 → 貼在日曆） | ✅ v0.3；照片存在手機瀏覽器（IndexedDB），不上傳；AI 辨識為第二階段 |
| 健身常見副作用（Notion 資料庫 23 項） | ✅ v0.3；「我的」與「今日」進入，依使用者設定顯示相關項目 |

## 從 Notion 同步動作資料與示範影片

Notion 的三個動作資料庫（重訓、瑜珈、有氧）與「健身常見副作用」資料庫是 APP 資料的來源。同步程式會：
- 把每個動作的欄位（動作要點、常見錯誤、建議次數組數…）寫進 `src/data/notion/*.json`，欄位名稱與 Notion 相同；Notion 新增欄位也會一起帶進來。
- 把「示範影片」欄位的檔案下載到 `public/media/<資料庫>/<動作 id>.<副檔名>`（支援 svg、png、jpg、gif、webp、mp4、webm、mov）。
- 副作用資料庫連頁面內文一起抓（存成「內文」欄位），APP 詳情頁優先顯示內文。
- 已存在的動作沿用原本的 id（例如 `s01`），使用者的運動紀錄不會錯亂；新動作接續編號；Notion 刪除的動作會移除。

### 第一次設定（約 3 分鐘）
1. 到 https://www.notion.so/profile/integrations → **New integration**，名稱例如「健身APP 同步」，類型選 Internal，建立後複製 **Internal Integration Secret**。
2. 在 Notion 打開「健身APP」頁面 → 右上 **…** → **Connections（連線）** → 加入剛建立的整合（底下三個資料庫會一起授權）。
3. 在 GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**，名稱 `NOTION_TOKEN`，貼上金鑰。

### 之後每次同步
- **在 GitHub 上（不用電腦指令）**：Actions → **Sync from Notion** → **Run workflow**。會自動下載、測試、提交並重新部署網站。
- **在自己電腦上**：`NOTION_TOKEN=你的金鑰 npm run sync`（只同步重訓：`npm run sync -- strength`），再 `npm test`、`npm run build`。

金鑰請只放在 GitHub Secrets 或自己電腦的環境變數，不要寫進程式碼或提交到 repository。

## 資料夾結構

```
src/
  main.tsx                 進入點、註冊 Service Worker
  App.tsx                  依路由切換頁面；沒設定過就進入初次設定
  router.tsx               Hash 路由（#/today），GitHub Pages 不會 404
  styles.css               設計語彙（畫風 01：米白／黑／網點灰＋螢光橘）
  types/                   共用資料型別（對應各模組）
  lib/
    calc.ts                模組二：熱量與安全規則（+ calc.test.ts）
    workout.ts             模組 5-3：菜單推薦、一週課表（+ workout.test.ts）
    storage.ts             資料儲存介面（目前 localStorage，之後可換雲端）
    date.ts                日期工具
  store/AppStore.tsx       全域狀態與紀錄操作
  data/
    notion/*.json          從 Notion 三個動作資料庫匯出的原始資料
    exercises.ts           把三個資料庫轉成統一格式
    foods.ts               示範用食物資料庫
  features/
    onboarding/            模組一：初次設定流程
    plan/                  今日菜單 hook
  pages/                   今日、跟練、動作詳情、跟練模式、日曆、飲食、我的
public/                    manifest、圖示、Service Worker
public/media/              示範影片／動畫（由 Notion 同步下載）
scripts/sync-notion.mjs    Notion 同步程式（+ notion-lib.mjs 與測試）
.github/workflows/         deploy.yml 自動部署；sync-notion.yml 從 Notion 同步
docs/ARCHITECTURE.md       系統架構與後續階段規劃
```

## 更新動作資料

在 Notion 資料庫新增或修改動作後，把資料匯出成同樣欄位名稱的 JSON，覆蓋 `src/data/notion/` 裡對應的檔案即可。
