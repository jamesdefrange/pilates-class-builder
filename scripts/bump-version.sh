#!/bin/zsh
# Bumps the ?v= number on every css and js link in index.html so browsers load fresh files.
cd "$(dirname "$0")/.."
current=$(grep -o '?v=[0-9]*' index.html | head -1 | cut -d= -f2)
next=$((current + 1))
sed -i '' "s/?v=$current\"/?v=$next\"/g" index.html
echo "Asset version $current -> $next"
