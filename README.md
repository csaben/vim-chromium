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

### Pausing on a site

Press `Ctrl+Shift+U` on any page to pause Vim keys for that whole site, or click the extension icon and choose **Always pause on this site**. The choice is saved and covers subdomains, so pausing `coderpad.io` also covers `app.coderpad.io`. A paused tab shows `off` on the extension badge, and the same shortcut resumes the site.

`leetcode.com`, `neetcode.io`, and `coderpad.io` are paused out of the box. The full list lives under **Paused sites** in settings, one host per line.

### Staying up to date

The extension reloads itself once it sees newer files on disk, and re-injects itself into open tabs, so fixes land without visiting `chrome://extensions`. Something still has to put the new files there, so register the updater once:

```powershell
& "$env:LOCALAPPDATA/VimChromium/update.ps1" -Register
```

That creates a `VimChromiumUpdate` scheduled task which fetches the latest `main` every 10 minutes. Use `-Minutes 30` to slow it down and `-Unregister` to remove it. Run `update.ps1` with no arguments for a one-off update, or pass `-AutoUpdate` to `install.ps1` to register the task while installing.

If you load the extension unpacked from a clone of this repo, point the updater at that folder (`-Folder D:/Code/vim-chromium`) and it runs `git pull --ff-only` there instead of downloading a zip.

### Google Docs

In Google Docs, press `Esc` (or `CapsLock` if you remap it) to enter normal mode.

| Key | Action |
| --- | --- |
| `h` `j` `k` `l` | Move the cursor |
| `w` `b` `e` | Move by word |
| `0` `$` | Start / end of line |
| `gg` `G` | Start / end of document |
| `yy` `dd` | Yank / delete the current line |
| `p` `P` | Put the yanked line below / above the cursor |
| `i` `a` | Insert before / after the cursor |
| `I` `A` | Insert at the start / end of the line |
| `o` `O` | Open a new line below / above and insert |

Keys held with `Ctrl`, `Alt`, or `Cmd` pass straight through in normal mode, so `Ctrl+V`, `Ctrl+C`, and `Ctrl+Z` still work, as do the history and window-switching shortcuts. Press `Esc` to return to normal mode after inserting.
