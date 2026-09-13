## Vim Chromium

A small Manifest V3 Chrome extension for Vim-style browsing: `j`/`k` scrolling, `gg`, `G`, history navigation, and switching between open Chrome windows.

### Install

After pushing this repository to a public GitHub repository:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/csaben/vim-chromium/main/install.ps1))) -Repo csaben/vim-chromium
```

In Git Bash, WSL, or another Unix shell, use:

```bash
curl -fsSL https://raw.githubusercontent.com/csaben/vim-chromium/main/install.sh | bash -s -- csaben/vim-chromium
```

Then open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the installer’s folder. It uses a stable location, so future installer runs update the same extension; click **Reload** rather than removing the old plugin. Chrome requires this browser step for manually installed extensions.

Click the extension icon and choose **Open settings**, or press `Ctrl+Shift+Y`. Shortcuts can be changed there.

### Google Docs

In Google Docs, press `Esc` to enter normal mode. Use `j`, `k`, `gg`, `G`, history, and window switching there. Press `i`, `a`, or `o` to return to insert mode so Google Docs receives normal typing.
