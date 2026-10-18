#!/usr/bin/env bash
# Runs the backend checks with curl.
#   bash test/run.sh                          → against the local server (npm run dev)
#   bash test/run.sh https://your-app.vercel.app
# Gemini replies vary, so read the printed replies too — but the PASS/FAIL checks must all pass.
cd "$(dirname "$0")"
BASE="${1:-http://localhost:3001}"
BASE="${BASE%/}" # tolerate a trailing slash
BASE="${BASE%/}" # tolerate a trailing slash
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

post() { # post <path> <body file>
  curl -s -w '\n%{http_code} %{time_total}' -X POST -H 'Content-Type: application/json' --data-binary @"$2" "$BASE$1"
}

echo "== Guards (no Gemini call needed) =="
echo '{}' > "$TMP/empty.json"
post /api/analyze "$TMP/empty.json" | node expect.js "analyze with no photo or name → 400" 'status===400'
post /api/chat "$TMP/empty.json" | node expect.js "chat with no item → 400" 'status===400'
echo '{not json' > "$TMP/bad.json"
post /api/chat "$TMP/bad.json" | node expect.js "malformed JSON → 400" 'status===400'
node -e "const m=Array.from({length:21},(_,i)=>({role:i%2?'user':'sprout',text:'hi'}));console.log(JSON.stringify({item:{name:'x'},messages:m,turn:10}))" > "$TMP/many.json"
post /api/chat "$TMP/many.json" | node expect.js "21 messages → 400" 'status===400'
node -e "console.log(JSON.stringify({item:{name:'x'},messages:[{role:'user',text:'a'.repeat(501)}],turn:1}))" > "$TMP/long.json"
post /api/chat "$TMP/long.json" | node expect.js "501-character message → 400" 'status===400'
node -e "console.log(JSON.stringify({imageBase64:'A'.repeat(2200000)}))" > "$TMP/huge.json"
post /api/analyze "$TMP/huge.json" | node expect.js "~1.6 MB image → 400" 'status===400'
curl -s -w '\n%{http_code} %{time_total}' "$BASE/api/chat" | node expect.js "GET → 405" 'status===405'

echo; echo "== /api/analyze =="
node -e "const fs=require('fs');console.log(JSON.stringify({imageBase64:fs.readFileSync('hoodie.jpg').toString('base64'),history:[]}))" > "$TMP/hoodie.json"
post /api/analyze "$TMP/hoodie.json" | node expect.js "hoodie photo → want + alarmed opening" 'status===200 && body.essential===false && body.category==="clothing" && body.openingLine && body.suggestedReplies.length>=2'
post /api/analyze analyze-painrelievers.json | node expect.js "pain relievers → essential + warm opening" 'status===200 && body.essential===true && body.openingLine'

echo; echo "== /api/chat (strict tagging) =="
post /api/chat chat-vague.json | node expect.js "VAGUE argument → no criteria" 'status===200 && body.criteriaHit.length===0'
post /api/chat chat-specific.json | node expect.js "SPECIFIC argument → replaces_broken" 'status===200 && body.criteriaHit.some(h=>h.id==="replaces_broken")'
post /api/chat chat-context.json | node expect.js "SHORT ANSWER to Sprout's question → frequent_use" 'status===200 && body.criteriaHit.some(h=>h.id==="frequent_use")'
post /api/chat chat-injection.json | node expect.js "prompt injection → no criteria" 'status===200 && body.criteriaHit.length===0'
post /api/chat chat-concede.json | node expect.js "conceded → alternatives, no tagging" 'status===200 && body.alternatives.length>=1 && body.criteriaHit.length===0'
