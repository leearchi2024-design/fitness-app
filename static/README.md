# 練起來 v0.2｜發布檔

這個資料夾是**已經建置好的成品**，不需要安裝任何東西。整包上傳到 GitHub 就能變成網站，手機也能「加入主畫面」當 APP 用。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | 入口頁，載入其他所有檔案 |
| `app.js` | 整個 APP 的程式（React 已打包在內，不需要另外下載） |
| `style.css` | 畫面樣式（畫風 01：米白、黑、網點灰、螢光橘） |
| `sw.js` | Service Worker：離線開啟、加入主畫面 |
| `manifest.webmanifest` | APP 名稱、圖示、主題色（Android／Chrome 安裝用） |
| `apple-touch-icon.png` | iPhone 主畫面圖示（180×180） |
| `icon-192.png`、`icon-512.png` | Android 與安裝畫面圖示 |
| `icon-maskable-512.png` | Android 自動裁形狀用的圖示 |
| `icon.svg`、`favicon-32.png` | 瀏覽器分頁小圖示 |
| `media/strength/s01.svg`… | 示範影片／動畫（檔名 = 動作 id，對照表見原始碼 `src/data/notion/strength.json`） |
| `.nojekyll` | 告訴 GitHub Pages 原樣發布，不要再處理（隱藏檔，記得一起上傳） |

## 上傳到 GitHub（不用打指令的方法）

1. 在 GitHub 建立新的 repository，例如 `fitness-app`，設成 **Public**。
2. 進入 repository → **Add file → Upload files**，把這個資料夾裡**所有檔案**拖進去（不要拖資料夾本身），按 **Commit changes**。
   - `.nojekyll` 是隱藏檔，Mac 在 Finder 按 `Cmd + Shift + .` 才看得到。
3. **Settings → Pages → Build and deployment**：Source 選 **Deploy from a branch**，Branch 選 **main**、資料夾選 **/ (root)**，按 Save。
4. 等 1–2 分鐘，網址會是 `https://<你的帳號>.github.io/fitness-app/`。

## 加到手機主畫面

- **iPhone**：用 Safari 打開網址 → 分享按鈕 → **加入主畫面**。
- **Android**：用 Chrome 打開網址 → 右上選單 → **安裝應用程式**（或「加到主畫面」）。

## 之後更新網站

1. 用新版的檔案覆蓋上傳。
2. 打開 `sw.js`，把 `const VERSION = 'v0.1.0';` 改成新的號碼（例如 `v0.1.1`）一起上傳。
   沒改的話，已經安裝的手機可能會繼續顯示舊版。

## 注意

- 資料存在使用者自己的手機或瀏覽器裡，換裝置不會同步（第二階段才有登入與雲端同步）。
- 一定要用 `https://` 網址打開，Service Worker 才會運作（GitHub Pages 預設就是 https）。
- 要修改功能請改「原始碼」專案再重新建置，不要直接改 `app.js`（它是壓縮過的成品）。
