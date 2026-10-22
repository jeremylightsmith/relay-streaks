#!/usr/bin/env sh
# Relay prepare hook: warm a freshly created per-card worktree so a run does not start from a
# cold dependency install. Each directory named in WARM (space-separated, relative to the repo
# root — e.g. "node_modules" or "deps _build") is copied into the new worktree from the
# configured cache dir, else from the main checkout, using an APFS copy-on-write clone where
# available and a plain recursive copy elsewhere. Empty WARM: nothing is copied.
#
# Invoked by ./relay right after `git worktree add`, cwd = the new worktree. Inputs arrive as
# both argv and env. A nonzero exit FAILS the run (fail-fast) — a broken cache surfaces at once.
#
#   $1/$RELAY_WORKTREE   abs path of the new worktree (== cwd)
#   $2/$RELAY_REF        card ref
#   $3/$RELAY_BRANCH     branch the run will attach
#   $4/$RELAY_BASE       base ref
#   $5/$RELAY_CACHE_DIR  configured cache dir (may be empty)
set -eu

WARM=""

[ -z "$WARM" ] && exit 0

WORKTREE="${RELAY_WORKTREE:-$1}"
CACHE_DIR="${RELAY_CACHE_DIR:-}"

# The warm source: the configured cache dir if it holds the dir, else the main checkout's own
# copy (the repo you ran `relay start` from). git's common dir points at the main checkout's
# .git; its parent is that checkout's root.
MAIN_ROOT="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's#/\.git/*$##')"

copy_dir() {
  # copy_dir <name>: clone <src>/<name> into $WORKTREE/<name> if the destination is missing.
  name="$1"
  dest="$WORKTREE/$name"
  [ -e "$dest" ] && return 0
  src=""
  if [ -n "$CACHE_DIR" ] && [ -d "$CACHE_DIR/$name" ]; then
    src="$CACHE_DIR/$name"
  elif [ -n "$MAIN_ROOT" ] && [ -d "$MAIN_ROOT/$name" ]; then
    src="$MAIN_ROOT/$name"
  fi
  [ -z "$src" ] && return 0     # nothing warm to copy → a cold build is correct, not an error
  mkdir -p "$(dirname "$dest")"
  # -c = APFS clonefile (copy-on-write); fall back to a plain recursive copy elsewhere.
  cp -Rc "$src" "$dest" 2>/dev/null || cp -R "$src" "$dest"
}

for name in $WARM; do
  copy_dir "$name"
done
echo "prepare-worktree: warmed $WORKTREE from ${CACHE_DIR:-$MAIN_ROOT}"
