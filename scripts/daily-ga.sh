#!/bin/bash
# Daily: pull Google Analytics into data/ga/latest.json, rebuild the owner dashboard + site, push (Vercel deploys).
# Scheduled by ~/Library/LaunchAgents/com.neptune.jiffy-ga.plist at 6:30am.
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
SITE="$HOME/PerezClaude/jiffy-site"; LOG="$SITE/data/ga/daily.log"
cd "$SITE"; mkdir -p data/ga
echo "=== $(date '+%Y-%m-%d %H:%M') start" >> "$LOG"
node scripts/ga-pull.mjs >> "$LOG" 2>&1
node private-build.js >> "$LOG" 2>&1
node build.js >> "$LOG" 2>&1
node scripts/a11y-check.mjs >> "$LOG" 2>&1 || { echo "accessibility check failed, not deploying" >> "$LOG"; exit 1; }
git add -A && git commit -q -m "Dashboard: daily GA pull $(date +%Y-%m-%d)" && git push -q mine main && git push -q origin main || echo "nothing to commit or push failed" >> "$LOG"
sleep 150; node scripts/indexnow.mjs >> "$LOG" 2>&1 || true  # tell Bing about changed pages once Vercel has deployed
echo "=== $(date '+%Y-%m-%d %H:%M') done" >> "$LOG"
