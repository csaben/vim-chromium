#!/usr/bin/env bash
set -euo pipefail
repo="${1:-${VIM_CHROMIUM_REPO:-your-user/vim-chromium}}"
tmp="$(mktemp -d)";trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://github.com/$repo/archive/refs/heads/main.tar.gz"|tar -xz -C "$tmp"
folder="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d|head -n 1)";printf 'Downloaded to %s\nOpen chrome://extensions, enable Developer mode, choose Load unpacked, and select that folder.\n' "$folder"
