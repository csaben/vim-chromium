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

You can also skip the installer and **Load unpacked** a clone of this repo directly, which makes `git pull` the whole update step.

Then open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the installer’s folder. It uses a stable location, so future installer runs update the same extension; click **Reload** rather than removing the old plugin. Chrome requires this browser step for manually installed extensions.

Click the extension icon and choose **Open settings**, or press `Ctrl+Shift+Y`. Shortcuts can be changed there.

### Pausing on a site

Press `Ctrl+Shift+U` on any page to pause Vim keys for that whole site, or click the extension icon and choose **Always pause on this site**. The choice is saved and covers subdomains, so pausing `coderpad.io` also covers `app.coderpad.io`. A paused tab shows `off` on the extension badge, and the same shortcut resumes the site.

`leetcode.com`, `neetcode.io`, and `coderpad.io` are paused out of the box. The full list lives under **Paused sites** in settings, one host per line.

### Staying up to date

The extension watches its own files and reloads itself about a second after they change, then re-injects the content script into open tabs. No trip to `chrome://extensions`, no tab refresh, nothing to schedule. Unpacked extensions serve their files straight from disk, so the worker can fetch and fingerprint its own source; a 30 s alarm wakes it if it has gone to sleep, and a reload is held back while Google Docs normal mode has the debugger attached.

An update is therefore just new files on disk. From a clone of this repo:

```powershell
git -C D:/Code/vim-chromium pull
```

From the installer's folder:

```powershell
& "$env:LOCALAPPDATA/VimChromium/update.ps1"
```

The badge reads `UPD` when GitHub has a version you do not, so you know when a pull is worth it. A manual reload is only needed if `background.js` is broken badly enough that the watcher never runs.

### Tests

`node test/unit.mjs` runs both scripts in a vm against stub `chrome.*` APIs and covers the Docs command sequences, per-site pause matching, the re-injection handover, and the auto-reload watcher. No browser or dependencies needed.

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
