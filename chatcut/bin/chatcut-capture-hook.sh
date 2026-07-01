#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
hook_script="$script_dir/chatcut-capture-hook.mjs"

is_executable_file() {
  [ -n "$1" ] && [ -f "$1" ] && [ -x "$1" ]
}

try_node() {
  candidate=$1
  shift
  if is_executable_file "$candidate"; then
    exec "$candidate" "$hook_script" "$@"
  fi
}

for candidate in \
  "${CHATCUT_CODEX_NODE:-}" \
  "${CODEX_BUNDLED_NODE:-}" \
  "${CODEX_NODE:-}" \
  "${NODE_BINARY:-}" \
  "${npm_node_execpath:-}"
do
  try_node "$candidate" "$@"
done

codex_home=${CODEX_HOME:-"$HOME/.codex"}
for candidate in \
  "$codex_home/dependencies/node/bin/node" \
  "$codex_home/dependencies/node/node" \
  "$codex_home/node/bin/node" \
  "$codex_home/bin/node" \
  "$HOME/.codex/dependencies/node/bin/node" \
  "$HOME/.codex/dependencies/node/node" \
  "$HOME/.codex/node/bin/node" \
  "$HOME/.codex/bin/node" \
  "${APPDIR:-}/usr/bin/node" \
  "/Applications/Codex.app/Contents/Resources/node/bin/node" \
  "/Applications/Codex.app/Contents/Resources/app/node/bin/node" \
  "/Applications/Codex.app/Contents/Frameworks/node/bin/node" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node" \
  "/usr/bin/node"
do
  try_node "$candidate" "$@"
done

for candidate in \
  "$codex_home"/dependencies/*/node/bin/node \
  "$codex_home"/dependencies/*/bin/node \
  "$HOME"/.codex/dependencies/*/node/bin/node \
  "$HOME"/.codex/dependencies/*/bin/node
do
  try_node "$candidate" "$@"
done

if command -v node >/dev/null 2>&1; then
  exec node "$hook_script" "$@"
fi

exit 127
