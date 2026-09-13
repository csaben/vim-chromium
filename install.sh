#!/usr/bin/env bash
set -euo pipefail
repo="${1:-${VIM_CHROMIUM_REPO:-your-user/vim-chromium}}"
tmp="$(mktemp -d)";trap 'rm -rf "$tmp"' EXIT
folder="${XDG_DATA_HOME:-$HOME/.local/share}/vim-chromium";mkdir -p "$folder"
curl -fsSL "https://github.com/$repo/archive/refs/heads/main.tar.gz"|tar -xz --strip-components=1 -C "$folder"
printf 'Downloaded to %s\nOpen chrome://extensions, enable Developer mode, and click Reload for this extension.\n' "$folder"
