# 系統架構

## 技術選擇

| 層級 | 選擇 | 理由 |
|---|---|---|
| 前端 | React 19 + TypeScript + Vite | 一份程式同時跑網頁與手機；型別保護熱量公式等關鍵邏輯 |
| 手機 | PWA（第一階段）→ Capacitor（上架時） | 先免審核、免費用 GitHub Pages 發布；要上架或用 Apple 健康時再包成原生 APP |
| 路由 | 自寫 Hash 路由 | GitHub Pages 是靜態主機，Hash 網址重新整理不會 404，也少一個套件 |
| 資料 | 裝置本機（localStorage） | MVP 不需要伺服器與帳號；`DataStore` 介面預留換成雲端 |
| 部署 | GitHub Actions → GitHub Pages | 推送 main 自動測試、建置、發布 |

這也回答了 Notion「待決定事項」中的「先做 iOS、Android 或跨平台」：建議**跨平台**，先 PWA，再用 Capacitor 上架。

## 資料流

```
Notion 動作資料庫 ──匯出 JSON──▶ src/data/notion ──exercises.ts──▶ Exercise[]
                                                                    │
UserProfile（初次設定）──▶ calc.ts ──▶ PlanSummary（熱量、蛋白質、喝水）
          │                                                         │
          └────────────▶ workout.ts ──▶ WorkoutPlan（熱身／主訓練／收操）
                                              │
                                    Session 跟練 ──完成──▶ WorkoutLog ──▶ 日曆、週報
食物資料庫／手動輸入 ──▶ FoodEntry ──▶ 熱量環、剩餘熱量、日曆
```

全部紀錄放在 `AppData`（`src/types`），由 `store/AppStore.tsx` 統一讀寫，再透過 `lib/storage.ts` 存到裝置。

## 已實作的規則

- BMR：Mifflin-St Jeor；「不透露」性別取男女中間值。
- 建議熱量：減脂 TDEE−400、維持 TDEE、增肌 TDEE+250；不低於 BMR 與女 1,200／男 1,500。
- 熱量模式：主要目標為增肌類 → 增肌；有選「減重減脂」→ 減脂；BMI 過低時強制改為維持並提示。
- 菜單：依目標部位、運動類型、程度、器材、時間篩選；新手不排跳躍動作；經期模式只排標示可做的動作；同一天菜單固定。
- 一週課表：依每週天數平均分散訓練日。

## 後續階段

### 第二階段
- **登入與雲端同步**：Supabase（Auth + Postgres + Storage），實作 `DataStore` 介面即可替換。
- **AI 拍照辨識食物**：前端拍照 → 後端函式（Supabase Edge Function）呼叫視覺模型 → 回傳估算份量與熱量，讓使用者修改後儲存。API 金鑰只放後端，不可放在前端程式。
- **條碼掃描**：瀏覽器 `BarcodeDetector` 或 ZXing，查詢營養標示資料。
- 食譜、一週菜單與購物清單；身體變化週報強化、進度照片（加密儲存）。
- 推播提醒（Web Push；iOS 需加入主畫面後才支援）。

### 第三階段
- Capacitor 包成 iOS／Android，串接 Apple 健康、Google Fit（Health Connect）。
- AI 姿勢偵測（MediaPipe Pose，在裝置上執行）、社群挑戰、會員訂閱。

## 仍待決定（來自 Notion）
- 動作示範用真人影片或 3D 動畫 → 影片檔放 Notion「示範影片」欄位或雲端儲存，`Exercise.videoUrl` 已預留。
- 食物資料庫自建或串接第三方 → 目前 `data/foods.ts` 為示範資料，建議改接衛福部食品營養成分資料庫。
