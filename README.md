# 陪步 Peibu · Prototype 0.1.0

**家庭學習節奏助手：老師給目標，家庭定限制，孩子看下一步。**

這是可操作的 local-first prototype，不是正式服務。僅含虛構示範資料，不包含真實孩子姓名、課表、票券、照片或任何既有專案資料。

## 已完成

- 任意日期的日程新增、編輯、取消單次活動，自訂份量與單位。
- 家長介面與孩子「下一小步」介面（僅為視圖切換，**不是帳號權限**）。
- 一般／精簡／休息模式，套用前顯示影響，能撤銷模式變更。
- 保護固定課程、生活留白與未勾選彈性的作業；不擅自改起始時間。
- 時間重疊、超出家庭可用時段的明確提示；目前不自動重排。
- 穩定活動ID，執行紀錄保存當時快照；改計畫不改歷史。
- 完成／需要幫忙／這次休息；實際分鐘與份量選填，不從「完成」推算。
- 紀錄更正保留原內容，不硬刪除。
- 儲存一週模板，帶入空白週；新活動取得新ID，不複製完成狀態。
- 家庭目標、暱稱、100／110／120%字級可編輯。
- 本機保存、1 MB內的陪步v1 JSON備份、匯入預覽、單日列印。
- 損毀資料／被拒絕保存／分頁衝突的明確警示，不靜默覆寫。

## 開始使用

Node.js **22.12以上**（建議22系列），npm。依賴鎖定在 `package-lock.json`。

```bash
npm ci
npm run dev
```

開啟 `http://127.0.0.1:4173`。`dev`先建置再啟動本機伺服器；**不含熱更新**，修改來源後另執行 `npm run build` 並重新整理。

```bash
npm run typecheck     # TypeScript嚴格型別檢查
npm test              # 建置 + Node內建測試
npm run check         # 上述完整檢查
npm run build         # 產生可部署的dist/
npm run standalone    # 產生artifacts/peibu-prototype.html
```

單檔HTML可直接用支援ES modules的瀏覽器開啟；檔案預覽器可能阻擋JavaScript。`file://`的本機保存行為依瀏覽器而異，清除瀏覽資料、搬移檔案或換裝置前請備份。開發與較可靠的origin測試請使用本機HTTP伺服器。

## 為什麼第一版採TypeScript + 原生DOM？

先把可測試的資料規則做好，不為單孩、本機原型引入伺服器、登入與完整前端框架。執行期沒有第三方套件；唯一npm開發依賴是TypeScript 5.8.3。這不是「最新版本」承諾，而是本次實際安裝並驗證的鎖定版本。

Domain與UI隔離；後續要採React／Vite，可以替換 `src/ui` 與 `src/app.ts`，保留資料規則、repository介面與回歸測試。不要為了框架重寫已驗證的事實／計畫分離邏輯。

## 專案結構

```text
src/
  domain/           型別、日期、日程規則、快照、模板、備份驗證
  infrastructure/   本機儲存adapter與分頁衝突檢查
  ui/               跳脫、圖示、純畫面render functions
  app.ts            互動、表單、匯入與錯誤提示
  styles.css        手機／桌面／列印樣式
scripts/            建置、preview server、單檔匯出、私人GitHub建立助手
tests/              Node單元測試、可選Playwright UI測試
docs/               架構、產品範圍、QA、GitHub設定、下一階段
.github/            CI與Issue／PR模板
AGENTS.md           Codex等開發代理的維護與資料安全規則
```

## GitHub 專案

遠端專案：`shimiccc7/peibu-prototype`，維持 **Private**。

本次匯入使用獨立分支 `bootstrap/prototype-v0.1.0`，以 Pull Request 交付，不直接覆寫或合併 `main`，不啟用公開網站。GitHub 的遠端提交與 CI 狀態以 PR / Actions 頁面為準；本機測試通過不等於遠端 CI 已通過。

只要此 repo 已存在，就不要執行 `npm run publish:github`：該助手只適用於**另建全新私人 repo**，不是更新現有 repo 的工具。既有專案請正常 clone、開分支、commit、push，再送 PR。詳細流程見 [GitHub設定](docs/GITHUB_SETUP.md)。

## 測試

本次通過40項Node單元／儲存測試，以及12項Chromium UI測試。UI測試是將產生的HTML載入記憶體，並使用**明確的Storage測試替身**；它不證明真實origin或手機的原生持久保存已驗證。另有無Storage時的警示測試。完整範圍與未測事項見 [QA](docs/QA.md)。

可選UI測試（Python 3.10+）：

```bash
python -m pip install -r requirements-e2e.txt
python -m playwright install chromium
npm run standalone
python tests/browser_smoke.py
```

## 尚未實作

真正登入與RBAC、多家庭／多孩、跨裝置同步、PWA安裝與service worker、AI匯入／評分、自動求解排程、行事曆寫入、推播、訂閱金流、正式公開部署。也**不支援舊版連假HTML備份直接匯入**。

## 資料與授權

本機資料鍵為 `peibu.prototype.v1`。第一次使用會建立虛構示範週。瀏覽器若無法保存，仍可操作但顯示暫存警示；請立即匯出備份，不要認為重整後仍存在。

零執行期第三方依賴不等於完整安全審核。不要把這個prototype當成兒童資料平台上線。本專案尚未選定開源授權，首次repo請保持Private。轉公開或商業化前，另行決定授權、商標與資料政策。
