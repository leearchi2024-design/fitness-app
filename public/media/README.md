# 示範影片／動畫

檔名規則：`<資料庫>/<動作 id>.<副檔名>`，例如 `strength/s01.svg` = 反向弓箭步。
動作 id 對照表在 `src/data/notion/*.json`（每列的 `id` 與 `示範影片` 欄位）。

支援格式：svg（動畫或插圖）、png、jpg、gif、webp、mp4、webm、mov。

通常不用手動放檔案：執行 `npm run sync` 或 GitHub Actions「Sync from Notion」會自動從 Notion 下載。
