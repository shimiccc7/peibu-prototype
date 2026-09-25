# 建立獨立的私人GitHub專案

**建議repo名稱：`peibu-prototype`；Visibility：Private。**

## 現有專案與本次匯入

目標為 `shimiccc7/peibu-prototype`（Private）。匯入採 `bootstrap/prototype-v0.1.0` 分支與 PR，保留 `main` 的初始提交。不部署網站，也不修改其他專案。

本文件下方的「路徑A／B」是**建立全新 repo 的歷史設定指引**。現有 repo 不需要再建立一次，亦不應再次執行 `publish:github`。後續請在現有 repo 上建立工作分支，檢查、提交並送 PR。

遠端是否已完成匯入、是否已合併、Actions 是否通過，請分別核對實際 branch / PR / Actions，三者不是同一件事。

## 路徑A：先在GitHub網頁建repo，再由連接器上傳

1. 開啟 GitHub 的 New repository 頁面：https://github.com/new
2. Owner選你的個人帳號；Repository name填 `peibu-prototype`。
3. Visibility選 **Private**。
4. 勾選 **Add a README file**，初始化預設分支。不要先選開源授權。
5. Create repository 後，把repo網址提供給開發工具。
6. 若GitHub App只授權指定repo，需將新repo加入該App的可存取清單；舊repo仍維持原授權。
7. 上傳前重新讀取repo狀態、README blob及main HEAD；使用非force的提交流程，不覆寫其他同時加入的內容。

建repo不等於部署網站，也不需要先訂閱其他付費服務。

## 路徑B：使用電腦上的GitHub CLI

先安裝Git、Node與GitHub CLI，透過瀏覽器完成登入。不要把PAT或密碼貼進聊天、程式或repo。

```bash
gh auth login
cd peibu-prototype
npm ci
npm run check
npm run publish:github
```

腳本會顯示Git作者及目標repo、要求輸入CREATE。只允許在本專案根目錄、新repo且沒有既有remote的狀態下執行。它會新建私人repo並推送main，不改既有repo。

手動等價流程（僅用於尚未初始化的專案目錄）：

```bash
git init -b main
git add .
git diff --cached --stat
# 先檢查：沒有.env、匯出資料、真實課表或錄音。
git commit -m "feat: bootstrap Peibu local-first prototype"
gh repo create peibu-prototype --private --source=. --remote=origin --push
```

GitHub CLI官方說明：https://cli.github.com/manual/gh_repo_create

## 上傳後驗收

- 確認repo顯示Private，且未啟用公開Pages。
- README、src、tests、docs與lockfile存在。
- 比對本地與遠端commit，不把本機提交稱為已push。
- 檢查Actions實際執行結果；本機測試通過不代表遠端CI已執行。
- 首個穩定版本可在遠端驗收後再標記v0.1.0。
- 部署應是另一個明確步驟，先確認公開或受保護預覽及資料範圍。
