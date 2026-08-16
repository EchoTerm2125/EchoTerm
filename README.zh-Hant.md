# EchoTerm

[English](README.md) | **繁體中文**

<p align="center">
  <img src="docs/images/readme-banner.png" alt="EchoTerm 橫幅">
</p>

具備 **echo 輸入** 功能的分割視窗終端機應用程式 — 只要輸入一次，就能把指令同時丟給多個終端機。對，就是這麼簡單。

## 為什麼會做 EchoTerm？

我一直在找一款能同時在多個終端機打指令的好用終端機，結果…找不到。所以乾脆自己動手做了一個。EchoTerm 就是從這個需求長出來的，整個設計也都繞著它打轉。

> **小提醒：** EchoTerm 目前只支援 **Windows**。**macOS** 支援還在研究中，之後會慢慢推出，敬請期待。

---

## 功能特色

### Echo 模式
在一個終端機輸入，內容會同步送到群組裡所有勾選的終端機 — 想一次在多台機器上跑同一個指令？這個功能就是為你準備的。

- 可以逐個終端機切換 echo，也可以一口氣全部開啟/關閉
- 「全部貼上」會把剪貼簿內容送到所有啟用 echo 的終端機

<p align="center">
  <img src="docs/images/echo-input.gif" alt="Echo 模式">
</p>

### 分頁與群組
- 把終端機整理進**分頁**，再把分頁整理進**群組**（工作區）
- 按右鍵就能重新命名、搬到其他群組、關閉所選/其他分頁

<p align="center">
  <img src="docs/images/show-group.gif" alt="分頁與群組">
</p>

### SSH 連線管理員
- 在可搜尋的側邊欄裡儲存並整理 SSH 連線、使用者和資料夾
- 一鍵連線，連線會直接以終端機分頁的方式開啟
- 可從 `~/.ssh/config` 匯入及匯出
- 用**主密碼**或作業系統層級的加密來保護你的連線

<p align="center">
  <img src="docs/images/manage-ssh-connections.gif" alt="SSH 連線管理員">
</p>

### 個人化設定
- 深色與淺色主題，任你挑
- 介面和終端機字型大小都能調整
- 預設 Shell 自由選：**PowerShell**、**CMD** 或 **Git Bash**
- 13 種介面語言：英文、德文、西班牙文、法文、日文、韓文、波蘭文、葡萄牙文（巴西）、俄文、土耳其文、越南文、簡體中文、繁體中文

### 貼心小細節
- 右鍵複製/貼上（可自行設定）
- 多行內容的貼上預覽
- 分頁、群組和視窗的關閉確認（每個都可以個別關掉）

<p align="center">
  <img src="docs/images/multi-line-paste.gif" alt="Multi-line paste">
</p>

### 還有更多
還有更多功能等著你親自探索 — 到處點點看，看看 EchoTerm 還能做些什麼。

---

## 截圖

<p align="center">
  <img src="docs/images/theme-dark.png" alt="深色主題截圖">
</p>
<p align="center">
  <img src="docs/images/theme-light.png" alt="淺色主題截圖">
</p>

---

## 系統需求

- **Windows 10 / 11**（64 位元）
- **Git Bash** 支援需要安裝 [Git for Windows](https://git-scm.com/download/win)（PowerShell 和 CMD 是 Windows 內建的）
- SSH 連線使用 Windows 內建的 `ssh` 用戶端

## 安裝方式

下載最新版本：

- **安裝程式**（`EchoTerm-Setup-x.x.x.exe`）— 標準 Windows 安裝程式
- **可攜版 ZIP**（`EchoTerm-x.x.x-win.zip`）— 解壓縮一次，直接執行 `EchoTerm.exe` 就能用

---

## 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|---|---|
| `Ctrl+N` | 新增分頁 |
| `Ctrl+Shift+N` | 新增群組 |
| `Ctrl+Shift+T` | 切換 echo 模式 |
| `Ctrl+W` | 關閉目前終端機 |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | 切換終端機 |
| `Ctrl+Shift+S` | 顯示/隱藏 SSH 側邊欄 |

---

## 意見回饋與問題回報

EchoTerm 還在很早期的開發階段，目前還不開放程式碼貢獻，但**非常歡迎回報問題** — 你的回饋會直接影響接下來的走向。

我的排程上還有一堆想做的功能和項目，你的建議可以幫我決定接下來先做什麼。

如果你遇到這些狀況，歡迎開 issue：

- 發現 bug — 請附上重現步驟、預期與實際行為，以及你的 Windows 版本
- 有功能建議或點子 — 說說使用情境，以及它能解決什麼問題
- 發現任何支援語言的翻譯有問題

開新 issue 之前，記得先搜尋一下既有 issue，避免重複。

想直接找我聊聊的話，也可以寄信到 [echoterm2125@gmail.com](mailto:echoterm2125@gmail.com)。

---

## 授權條款

EchoTerm 採用 **PolyForm Shield License 1.0.0** 授權 — 你可以自由使用、複製、修改與散布，**但不能販售，也不能當作競爭服務提供**。完整條文請參考 [LICENSE](LICENSE)。
