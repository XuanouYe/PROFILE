#!/bin/zsh
cd -- "${0:A:h}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  print 'Node.js is required. Install Node.js 22 or newer, then open this file again.'
  read '?Press Return to close.'
  exit 1
fi
export PORT=4174
node scripts/serve.mjs --open
read '?Press Return to close.'
