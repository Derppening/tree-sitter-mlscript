#!/usr/bin/env bash
# Parse a corpus of .mls files and summarise where the grammar still fails.
#
# Usage: script/parse-corpus.sh <dir-or-files...>
set -uo pipefail

TS="${TS:-./node_modules/.bin/tree-sitter}"

files=()
for arg in "$@"; do
  if [[ -d "$arg" ]]; then
    while IFS= read -r f; do files+=("$f"); done < <(find "$arg" -name '*.mls' | sort)
  else
    files+=("$arg")
  fi
done

total=0
failed=0
: >/tmp/mls-corpus-errors.txt

for f in "${files[@]}"; do
  total=$((total + 1))
  err=$("$TS" parse --quiet "$f" 2>/dev/null | head -1)
  if [[ -n "$err" ]]; then
    failed=$((failed + 1))
    # `(ERROR [row, col] - [row, col])` -> the offending source line
    row=$(sed -E 's/.*\[([0-9]+), [0-9]+\] - .*/\1/' <<<"$err")
    if [[ "$row" =~ ^[0-9]+$ ]]; then
      line=$(sed -n "$((row + 1))p" "$f" | sed 's/^[[:space:]]*//' | cut -c1-70)
    else
      line="<unknown>"
    fi
    printf '%s\t%s\t%s\n' "$f" "$row" "$line" >>/tmp/mls-corpus-errors.txt
  fi
done

echo "parsed:  $total"
echo "clean:   $((total - failed))"
echo "failed:  $failed"
if [[ $total -gt 0 ]]; then
  awk -v c=$((total - failed)) -v t="$total" 'BEGIN { printf "rate:    %.1f%%\n", 100 * c / t }'
fi
echo
echo "first error line of each failing file -> /tmp/mls-corpus-errors.txt"
