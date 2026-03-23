// ============================================================
// components.js
// Reusable Vue 3 components for a Steem + Vue Router SPA.
// No app-specific logic — extend freely.
// ============================================================

// ---- Draft auto-save helpers ----
// Thin wrappers around localStorage for persisting in-progress composer drafts.
// Keys are namespaced with "st_draft_" to avoid collisions.
// All operations are try/caught so storage quota errors never break the UI.
const draftStorage = {
  save(key, value) {
    try { localStorage.setItem("st_draft_" + key, JSON.stringify(value)); } catch {}
  },
  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem("st_draft_" + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  clear(key) {
    try { localStorage.removeItem("st_draft_" + key); } catch {}
  }
};

// ---- Live Twist Templates ----
const LIVE_TWIST_TEMPLATES = [
  { id: "poll", icon: "\ud83d\uddf3\ufe0f", name: "Poll", desc: "Local interactive poll \u2014 vote tracked in memory",
    code: "// Local Poll \u2014 vote tracked in memory only\nconst options = [\"Option A\", \"Option B\", \"Option C\"];\nlet voted = null;\n\nfunction draw() {\n  const items = options.map((opt, i) => {\n    const sel = voted === i;\n    const style = sel\n      ? \"background:#6d28d9;color:#fff;border:1px solid #a855f7;\"\n      : \"background:#1a1030;color:#e8e0f0;border:1px solid #3b1f5e;\";\n    return \"<button id='v\" + i + \"' style='\" + style +\n      \"border-radius:8px;padding:8px 14px;margin:4px;font-size:14px;'>\" +\n      (sel ? \"\\u2713 \" : \"\") + opt + \"</button>\";\n  }).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-weight:600;color:#c084fc;margin-bottom:8px;'>Which do you prefer?</div>\" +\n    \"<div>\" + items + \"</div>\" +\n    (voted !== null ? \"<div style='margin-top:8px;font-size:13px;color:#9b8db0;'>You selected: <b style='color:#e8e0f0;'>\" + options[voted] + \"</b></div>\" : \"\") +\n    \"</div>\"\n  );\n  options.forEach((_, i) => {\n    const btn = document.getElementById(\"v\" + i);\n    if (btn) btn.onclick = () => { voted = i; draw(); };\n  });\n}\ndraw();" },
  { id: "quiz", icon: "\ud83e\udde0", name: "Quiz", desc: "Multiple-choice quiz with instant feedback",
    code: "// Quiz \u2014 instant feedback, no backend needed\nconst questions = [\n  { q: \"What is the capital of Japan?\", choices: [\"Seoul\",\"Beijing\",\"Tokyo\",\"Bangkok\"], answer: 2 },\n  { q: \"How many sides does a hexagon have?\", choices: [\"5\",\"6\",\"7\",\"8\"], answer: 1 },\n  { q: \"What is 7 x 8?\", choices: [\"54\",\"56\",\"58\",\"64\"], answer: 1 }\n];\nlet current = 0, score = 0, picked = null;\n\nfunction draw() {\n  if (current >= questions.length) {\n    app.render(\n      \"<div style='padding:8px;text-align:center;'>\" +\n      \"<div style='font-size:32px;margin-bottom:8px;'>\" + (score === questions.length ? \"\\uD83C\\uDFC6\" : \"\\uD83C\\uDFAF\") + \"</div>\" +\n      \"<div style='font-size:18px;color:#e8e0f0;font-weight:600;'>Score: \" + score + \"/\" + questions.length + \"</div>\" +\n      \"<button id='restart' style='margin-top:12px;'>Restart</button>\" +\n      \"</div>\"\n    );\n    document.getElementById(\"restart\").onclick = () => { current = 0; score = 0; picked = null; draw(); };\n    return;\n  }\n  const q = questions[current];\n  const choices = q.choices.map((c, i) => {\n    let bg = \"#1a1030\", color = \"#e8e0f0\", border = \"#3b1f5e\";\n    if (picked !== null) {\n      if (i === q.answer) { bg = \"#0c2d1a\"; color = \"#4ade80\"; border = \"#166534\"; }\n      else if (i === picked) { bg = \"#2d0a0a\"; color = \"#fca5a5\"; border = \"#7f1d1d\"; }\n    }\n    return \"<button id='c\" + i + \"' style='background:\" + bg + \";color:\" + color +\n      \";border:1px solid \" + border + \";border-radius:8px;padding:7px 12px;margin:3px;font-size:13px;'>\" + c + \"</button>\";\n  }).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-size:12px;color:#9b8db0;margin-bottom:4px;'>Q\" + (current+1) + \"/\" + questions.length + \"</div>\" +\n    \"<div style='font-weight:600;color:#e8e0f0;margin-bottom:8px;'>\" + q.q + \"</div>\" +\n    \"<div>\" + choices + \"</div>\" +\n    (picked !== null ? \"<button id='next' style='margin-top:10px;'>Next</button>\" : \"\") +\n    \"</div>\"\n  );\n  if (picked === null) {\n    q.choices.forEach((_, i) => {\n      const btn = document.getElementById(\"c\" + i);\n      if (btn) btn.onclick = () => { picked = i; if (i === q.answer) score++; draw(); };\n    });\n  } else {\n    const n = document.getElementById(\"next\");\n    if (n) n.onclick = () => { current++; picked = null; draw(); };\n  }\n}\ndraw();" },
  { id: "clicker", icon: "\ud83c\udfae", name: "Clicker Game", desc: "Click as fast as you can in 10 seconds",
    code: "// Clicker game \u2014 score as fast as you can in 10 seconds\nlet score = 0, running = false, timeLeft = 10, timer = null;\n\nfunction draw() {\n  app.render(\n    \"<div style='padding:8px;text-align:center;'>\" +\n    \"<div style='font-size:13px;color:#9b8db0;margin-bottom:8px;'>Click as fast as you can!</div>\" +\n    \"<div style='font-size:32px;font-weight:700;color:#c084fc;margin-bottom:8px;'>\" + score + \"</div>\" +\n    (running\n      ? \"<div style='font-size:13px;color:#fb923c;margin-bottom:8px;'>&#9203; \" + timeLeft + \"s left</div>\" +\n        \"<button id='tap' style='font-size:18px;padding:12px 28px;'>&#128070; Click!</button>\"\n      : \"<div style='font-size:13px;color:#9b8db0;margin-bottom:8px;'>\" +\n        (timeLeft === 0 ? \"Time up! Final score: \" + score : \"Ready?\") + \"</div>\" +\n        \"<button id='start'>&#9654; Start</button>\"\n    ) +\n    \"</div>\"\n  );\n  if (running) {\n    const tap = document.getElementById(\"tap\");\n    if (tap) tap.onclick = () => { score++; draw(); };\n  } else {\n    const start = document.getElementById(\"start\");\n    if (start) start.onclick = () => {\n      score = 0; timeLeft = 10; running = true; draw();\n      timer = setInterval(() => {\n        timeLeft--;\n        if (timeLeft <= 0) { clearInterval(timer); running = false; }\n        draw();\n      }, 1000);\n    };\n  }\n}\ndraw();" },
  { id: "calculator", icon: "\ud83e\uddee", name: "Calculator", desc: "Steem Power curation ROI calculator",
    code: "// Steem Curation ROI Calculator\nlet sp = 1000, apy = 8.5;\n\nfunction calc() {\n  const daily = sp * apy / 100 / 365;\n  const monthly = daily * 30;\n  const yearly = sp * apy / 100;\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-weight:600;color:#c084fc;margin-bottom:10px;'>Steem Curation ROI</div>\" +\n    \"<label style='font-size:12px;color:#9b8db0;'>Steem Power (SP)</label>\" +\n    \"<div style='display:flex;align-items:center;gap:8px;margin:4px 0 10px;'>\" +\n    \"<input id='sp' type='range' min='100' max='100000' step='100' value='\" + sp + \"' style='flex:1;accent-color:#a855f7;'>\" +\n    \"<span style='color:#e8e0f0;font-weight:600;min-width:60px;'>\" + sp.toLocaleString() + \" SP</span></div>\" +\n    \"<label style='font-size:12px;color:#9b8db0;'>Estimated APY (%)</label>\" +\n    \"<div style='display:flex;align-items:center;gap:8px;margin:4px 0 14px;'>\" +\n    \"<input id='apy' type='range' min='1' max='30' step='0.5' value='\" + apy + \"' style='flex:1;accent-color:#a855f7;'>\" +\n    \"<span style='color:#e8e0f0;font-weight:600;min-width:50px;'>\" + apy + \"%</span></div>\" +\n    \"<div style='background:#0f0a1e;border-radius:8px;padding:10px;border:1px solid #3b1f5e;'>\" +\n    \"<div style='display:flex;justify-content:space-between;margin-bottom:4px;'><span style='color:#9b8db0;'>Daily</span><b style='color:#4ade80;'>+\" + daily.toFixed(3) + \" SP</b></div>\" +\n    \"<div style='display:flex;justify-content:space-between;margin-bottom:4px;'><span style='color:#9b8db0;'>Monthly</span><b style='color:#4ade80;'>+\" + monthly.toFixed(2) + \" SP</b></div>\" +\n    \"<div style='display:flex;justify-content:space-between;'><span style='color:#9b8db0;'>Yearly</span><b style='color:#c084fc;font-size:16px;'>+\" + yearly.toFixed(1) + \" SP</b></div>\" +\n    \"</div></div>\"\n  );\n  document.getElementById(\"sp\").oninput = e => { sp = +e.target.value; calc(); };\n  document.getElementById(\"apy\").oninput = e => { apy = +e.target.value; calc(); };\n}\ncalc();" },
  { id: "chart", icon: "\ud83d\udcca", name: "Chart", desc: "Interactive bar chart with slider filter",
    code: "// Interactive bar chart with filter\nconst data = [\n  { label: \"Jan\", value: 42 }, { label: \"Feb\", value: 67 },\n  { label: \"Mar\", value: 55 }, { label: \"Apr\", value: 89 },\n  { label: \"May\", value: 73 }, { label: \"Jun\", value: 95 },\n  { label: \"Jul\", value: 60 }, { label: \"Aug\", value: 82 }\n];\nlet threshold = 0;\n\nfunction draw() {\n  const max = Math.max(...data.map(d => d.value));\n  const filtered = data.filter(d => d.value >= threshold);\n  const bars = filtered.map(d => {\n    const pct = Math.round(d.value / max * 100);\n    const color = d.value >= 80 ? \"#c084fc\" : d.value >= 60 ? \"#a855f7\" : \"#6d28d9\";\n    return \"<div style='display:flex;align-items:center;gap:6px;margin-bottom:5px;'>\" +\n      \"<div style='width:30px;font-size:11px;color:#9b8db0;'>\" + d.label + \"</div>\" +\n      \"<div style='flex:1;background:#1a1030;border-radius:4px;height:20px;overflow:hidden;'>\" +\n      \"<div style='width:\" + pct + \"%;background:\" + color + \";height:100%;border-radius:4px;'></div></div>\" +\n      \"<div style='width:28px;font-size:12px;color:#e8e0f0;text-align:right;'>\" + d.value + \"</div></div>\";\n  }).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-weight:600;color:#c084fc;margin-bottom:8px;'>Monthly Activity</div>\" +\n    \"<label style='font-size:12px;color:#9b8db0;'>Min value: <b style='color:#e8e0f0;'>\" + threshold + \"</b></label>\" +\n    \"<input id='thr' type='range' min='0' max='90' value='\" + threshold + \"' style='width:100%;margin:4px 0 10px;accent-color:#a855f7;'>\" +\n    (bars || \"<div style='color:#5a4e70;font-size:13px;'>No data above threshold.</div>\") +\n    \"</div>\"\n  );\n  document.getElementById(\"thr\").oninput = e => { threshold = +e.target.value; draw(); };\n}\ndraw();" },
  { id: "expandable", icon: "\ud83d\udcd6", name: "Expandable", desc: "Tabbed collapsible content sections",
    code: "// Tabbed expandable content\nconst tabs = [\n  { label: \"Overview\", content: \"This is the overview section. Put a summary here to keep the card compact.\" },\n  { label: \"Details\",  content: \"Here are the full details. Add tables, lists, or longer explanations.\" },\n  { label: \"Sources\",  content: \"1. Steem Whitepaper (2016)\n2. Steem Developer Portal\n3. Community research.\" }\n];\nlet active = 0;\n\nfunction draw() {\n  const tabBar = tabs.map((t, i) =>\n    \"<button id='tab\" + i + \"' style='padding:5px 12px;font-size:12px;margin-right:4px;\" +\n    \"border-radius:6px 6px 0 0;border:1px solid \" + (active===i ? \"#a855f7\" : \"#3b1f5e\") + \";\" +\n    \"background:\" + (active===i ? \"#2e2050\" : \"none\") + \";color:\" + (active===i ? \"#e8e0f0\" : \"#9b8db0\") + \";'>\" +\n    t.label + \"</button>\"\n  ).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'><div>\" + tabBar + \"</div>\" +\n    \"<div style='background:#0f0a1e;border:1px solid #3b1f5e;border-radius:0 6px 6px 6px;\" +\n    \"padding:10px;font-size:13px;color:#c0b0e0;white-space:pre-wrap;min-height:60px;'>\" +\n    tabs[active].content + \"</div></div>\"\n  );\n  tabs.forEach((_, i) => {\n    const b = document.getElementById(\"tab\" + i);\n    if (b) b.onclick = () => { active = i; draw(); };\n  });\n}\ndraw();" },
  { id: "story", icon: "\ud83d\udcdc", name: "Story", desc: "Branching choose-your-own-adventure",
    code: "// Choose Your Own Adventure\nconst story = {\n  start: {\n    text: \"You stand at a crossroads in a dark forest. The path forks ahead.\",\n    choices: [{ text: \"Take the left path\", next: \"left\" }, { text: \"Take the right path\", next: \"right\" }]\n  },\n  left: {\n    text: \"You find a glowing chest! Inside is 100 STEEM. Lucky!\",\n    choices: [{ text: \"Return to start\", next: \"start\" }]\n  },\n  right: {\n    text: \"You encounter a troll. He demands a riddle: what has keys but no locks?\",\n    choices: [{ text: \"A piano!\", next: \"win\" }, { text: \"A map!\", next: \"lose\" }]\n  },\n  win: {\n    text: \"Correct! The troll bows and lets you pass to the treasure vault: 500 STEEM!\",\n    choices: [{ text: \"Play again\", next: \"start\" }]\n  },\n  lose: {\n    text: \"Wrong! The troll eats your sandwich and chases you away.\",\n    choices: [{ text: \"Try again\", next: \"start\" }]\n  }\n};\nlet scene = \"start\";\n\nfunction draw() {\n  const s = story[scene];\n  const choices = s.choices.map((c, i) =>\n    \"<button id='ch\" + i + \"' style='display:block;width:100%;text-align:left;\" +\n    \"padding:8px 12px;margin:4px 0;border-radius:8px;border:1px solid #3b1f5e;\" +\n    \"background:#1a1030;color:#e8e0f0;font-size:13px;'>\" + c.text + \"</button>\"\n  ).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-size:14px;color:#e8e0f0;line-height:1.6;margin-bottom:12px;\" +\n    \"padding:10px;background:#0f0a1e;border-radius:8px;border:1px solid #2e2050;'>\" + s.text + \"</div>\" +\n    \"<div>\" + choices + \"</div></div>\"\n  );\n  s.choices.forEach((c, i) => {\n    const b = document.getElementById(\"ch\" + i);\n    if (b) b.onclick = () => { scene = c.next; draw(); };\n  });\n}\ndraw();" },
  { id: "demo", icon: "\ud83d\udcbb", name: "Code Demo", desc: "Step-by-step algorithm visualizer",
    code: "// Bubble Sort Visualizer\nconst arr = [64, 34, 25, 12, 22, 11, 90];\nlet steps = [], stepIdx = 0;\n\nfunction generateSteps() {\n  const a = [...arr];\n  steps = [{ arr: [...a], msg: \"Initial array\" }];\n  for (let i = 0; i < a.length - 1; i++) {\n    for (let j = 0; j < a.length - i - 1; j++) {\n      if (a[j] > a[j+1]) {\n        [a[j], a[j+1]] = [a[j+1], a[j]];\n        steps.push({ arr: [...a], msg: \"Swapped positions \" + j + \" and \" + (j+1) });\n      }\n    }\n  }\n  steps.push({ arr: [...a], msg: \"Sorted!\" });\n}\ngenerateSteps();\n\nfunction draw() {\n  const s = steps[stepIdx];\n  const max = Math.max(...s.arr);\n  const bars = s.arr.map(v =>\n    \"<div style='display:inline-flex;flex-direction:column;align-items:center;margin:0 3px;'>\" +\n    \"<div style='width:28px;background:linear-gradient(135deg,#6d28d9,#a855f7);border-radius:4px 4px 0 0;height:\" + Math.round(v/max*120) + \"px;'></div>\" +\n    \"<div style='font-size:11px;color:#9b8db0;margin-top:2px;'>\" + v + \"</div></div>\"\n  ).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-weight:600;color:#c084fc;margin-bottom:6px;'>Bubble Sort</div>\" +\n    \"<div style='display:flex;align-items:flex-end;height:140px;padding:0 4px;margin-bottom:8px;border-bottom:1px solid #2e2050;'>\" + bars + \"</div>\" +\n    \"<div style='font-size:12px;color:#9b8db0;margin-bottom:8px;'>Step \" + (stepIdx+1) + \"/\" + steps.length + \": \" + s.msg + \"</div>\" +\n    \"<div style='display:flex;gap:6px;'>\" +\n    \"<button id='prev' style='padding:4px 12px;font-size:12px;background:#1a1030;border:1px solid #3b1f5e;color:#9b8db0;'\" + (stepIdx===0?\" disabled\":\"\") + \">Prev</button>\" +\n    \"<button id='next' style='padding:4px 12px;font-size:12px;'\" + (stepIdx===steps.length-1?\" disabled\":\"\") + \">Next</button>\" +\n    \"</div></div>\"\n  );\n  const prev = document.getElementById(\"prev\");\n  const next = document.getElementById(\"next\");\n  if (prev) prev.onclick = () => { if (stepIdx > 0) { stepIdx--; draw(); } };\n  if (next) next.onclick = () => { if (stepIdx < steps.length-1) { stepIdx++; draw(); } };\n}\ndraw();" },
  { id: "explorer", icon: "\ud83d\udd0d", name: "Data Explorer", desc: "Filterable and sortable local dataset",
    code: "// Data Explorer \u2014 filter and sort a local dataset\nconst data = [\n  { name: \"Bitcoin\",  symbol: \"BTC\",   price: 65000, change: 2.4  },\n  { name: \"Ethereum\", symbol: \"ETH\",   price: 3200,  change: -1.2 },\n  { name: \"Steem\",    symbol: \"STEEM\", price: 0.28,  change: 5.7  },\n  { name: \"Litecoin\", symbol: \"LTC\",   price: 85,    change: 0.9  },\n  { name: \"Cardano\",  symbol: \"ADA\",   price: 0.45,  change: -0.8 },\n  { name: \"Solana\",   symbol: \"SOL\",   price: 142,   change: 3.1  }\n];\nlet query = \"\", sortBy = \"name\", sortDir = 1;\n\nfunction draw() {\n  const q = query.toLowerCase();\n  let rows = data\n    .filter(d => d.name.toLowerCase().includes(q) || d.symbol.toLowerCase().includes(q))\n    .sort((a, b) => {\n      const av = a[sortBy], bv = b[sortBy];\n      return typeof av === \"string\" ? av.localeCompare(bv) * sortDir : (av - bv) * sortDir;\n    });\n  const cols = [\"name\",\"symbol\",\"price\",\"change\"];\n  const headers = cols.map(c =>\n    \"<th id='h_\" + c + \"' style='padding:6px 8px;text-align:left;color:#a855f7;cursor:pointer;font-size:12px;'>\" +\n    c[0].toUpperCase() + c.slice(1) + (sortBy===c ? (sortDir===1?\" ^\":\" v\") : \"\") + \"</th>\"\n  ).join(\"\");\n  const rowsHtml = rows.map(d =>\n    \"<tr style='border-bottom:1px solid #2e2050;'>\" +\n    \"<td style='padding:5px 8px;color:#e8e0f0;font-size:13px;'>\" + d.name + \"</td>\" +\n    \"<td style='padding:5px 8px;color:#9b8db0;font-size:12px;'>\" + d.symbol + \"</td>\" +\n    \"<td style='padding:5px 8px;color:#e8e0f0;font-size:13px;'>$\" + d.price.toLocaleString() + \"</td>\" +\n    \"<td style='padding:5px 8px;color:\" + (d.change >= 0 ? \"#4ade80\" : \"#fca5a5\") + \";font-size:13px;'>\" +\n    (d.change >= 0 ? \"+\" : \"\") + d.change + \"%</td></tr>\"\n  ).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<input id='q' type='text' placeholder='Search...' value='\" + query.replace(/'/g, \"\") + \"' style='width:100%;margin-bottom:8px;box-sizing:border-box;'>\" +\n    \"<table style='width:100%;border-collapse:collapse;'><thead><tr>\" + headers + \"</tr></thead>\" +\n    \"<tbody>\" + rowsHtml + \"</tbody></table></div>\"\n  );\n  document.getElementById(\"q\").oninput = e => { query = e.target.value; draw(); };\n  cols.forEach(c => {\n    const h = document.getElementById(\"h_\" + c);\n    if (h) h.onclick = () => { sortDir = sortBy===c ? -sortDir : 1; sortBy = c; draw(); };\n  });\n}\ndraw();" },
  { id: "prototype", icon: "\ud83c\udfa8", name: "UI Prototype", desc: "Interactive UI mockup with multiple states",
    code: "// UI Prototype \u2014 dashboard preview with interactive cards\nconst cards = [\n  { title: \"Twist Love\", value: \"2.4K\", icon: \"&#10084;\", trend: \"+12%\", color: \"#e879f9\" },\n  { title: \"Retwists\",   value: \"847\",  icon: \"&#128260;\", trend: \"+8%\",  color: \"#4ade80\" },\n  { title: \"Reputation\", value: \"68\",   icon: \"&#11088;\",  trend: \"+2\",   color: \"#fb923c\" },\n  { title: \"Followers\",  value: \"1.2K\", icon: \"&#128100;\", trend: \"+34\",  color: \"#22d3ee\" }\n];\nlet active = null;\n\nfunction draw() {\n  const grid = cards.map((c, i) => {\n    const on = active === i;\n    return \"<div id='card\" + i + \"' style='background:\" + (on ? \"#2e2050\" : \"#1a1030\") + \";\" +\n      \"border:1px solid \" + (on ? c.color : \"#3b1f5e\") + \";border-radius:10px;padding:12px;cursor:pointer;'>\" +\n      \"<div style='display:flex;justify-content:space-between;align-items:flex-start;'>\" +\n      \"<div><div style='font-size:11px;color:#9b8db0;margin-bottom:4px;'>\" + c.title + \"</div>\" +\n      \"<div style='font-size:20px;font-weight:700;color:#e8e0f0;'>\" + c.value + \"</div></div>\" +\n      \"<span style='font-size:20px;'>\" + c.icon + \"</span></div>\" +\n      \"<div style='font-size:11px;color:\" + c.color + \";margin-top:6px;'>\" + c.trend + \" this month</div></div>\";\n  }).join(\"\");\n  app.render(\n    \"<div style='padding:4px;'>\" +\n    \"<div style='font-weight:600;color:#c084fc;margin-bottom:8px;font-size:13px;'>Dashboard Preview</div>\" +\n    \"<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;'>\" + grid + \"</div>\" +\n    (active !== null\n      ? \"<div style='background:#0f0a1e;border:1px solid \" + cards[active].color + \";border-radius:8px;padding:10px;font-size:12px;color:#9b8db0;'>\" +\n        \"Selected: <b style='color:\" + cards[active].color + \";'>\" + cards[active].title + \"</b> \" + cards[active].value + \" (\" + cards[active].trend + \")</div>\"\n      : \"<div style='font-size:12px;color:#5a4e70;font-style:italic;'>Click a card to inspect</div>\"\n    ) + \"</div>\"\n  );\n  cards.forEach((_, i) => {\n    const el = document.getElementById(\"card\" + i);\n    if (el) el.onclick = () => { active = active===i ? null : i; draw(); };\n  });\n}\ndraw();" },
];

// ---- AppNotificationComponent ----
// A slim toast bar rendered at the top of the app.
// Type: "error" | "success" | "info"
// Auto-dismisses after 3.5 s for success/info; errors stay until dismissed.
const AppNotificationComponent = {
  name: "AppNotificationComponent",
  props: {
    message: String,
    type: { type: String, default: "error" }
  },
  emits: ["dismiss"],
  data() {
    return { timer: null };
  },
  watch: {
    message(val) {
      clearTimeout(this.timer);
      if (val && this.type !== "error") {
        this.timer = setTimeout(() => this.$emit("dismiss"), 3500);
      }
    }
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  computed: {
    styles() {
      const base = {
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        margin: "10px auto", padding: "10px 14px",
        borderRadius: "6px", maxWidth: "600px",
        fontSize: "14px", gap: "10px"
      };
      if (this.type === "success")
        return { ...base, background: "#0a2d12", border: "1px solid #166534", color: "#86efac" };
      if (this.type === "info")
        return { ...base, background: "#0a1a2d", border: "1px solid #1e3a5f", color: "#93c5fd" };
      return   { ...base, background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#fca5a5" };
    },
    icon() {
      if (this.type === "success") return "✅";
      if (this.type === "info")    return "ℹ️";
      return "⚠️";
    }
  },
  template: `
    <div v-if="message" :style="styles" role="alert">
      <span>{{ icon }} {{ message }}</span>
      <button
        @click="$emit('dismiss')"
        style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;color:inherit;line-height:1;"
        aria-label="Dismiss"
      >✕</button>
    </div>
  `
};

// ---- AuthComponent ----
// Handles login (via Steem Keychain) and logout.
// Emits: login(username), logout, close
const AuthComponent = {
  name: "AuthComponent",
  props: {
    username:    String,
    hasKeychain: Boolean,
    loginError:  String,
    isLoggingIn: { type: Boolean, default: false }
  },
  emits: ["login", "logout", "close"],
  data() {
    return { usernameInput: "" };
  },
  watch: {
    username(val) {
      if (val) this.$emit("close");
    }
  },
  methods: {
    submit() {
      const val = this.usernameInput.trim().toLowerCase();
      if (!val) return;
      this.$emit("login", val);
    },
    onKeydown(e) {
      if (e.key === "Enter")  this.submit();
      if (e.key === "Escape") this.$emit("close");
    }
  },
  template: `
    <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0;">
      <template v-if="!username">
        <input
          v-model="usernameInput"
          type="text"
          placeholder="Steem username"
          autocomplete="username"
          style="padding:7px 10px;border-radius:20px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:14px;width:180px;"
          @keydown="onKeydown"
        />
        <button @click="submit" :disabled="!usernameInput.trim() || isLoggingIn">Sign in</button>
        <button @click="$emit('close')" style="background:#2e2050;border-radius:20px;">Cancel</button>
        <div v-if="loginError" style="width:100%;color:#c62828;font-size:13px;margin-top:4px;">
          {{ loginError }}
        </div>
      </template>
      <template v-else>
        <span style="font-size:14px;">Logged in as <strong>@{{ username }}</strong></span>
        <button @click="$emit('logout')" style="background:#2e2050;border-radius:20px;">Logout</button>
      </template>
    </div>
  `
};

// ---- UserProfileComponent ----
// Rich profile card: cover, avatar, display name, reputation, bio,
// stats row (followers, following, posts), location, website, join date.
// Receives the enriched profileData object from fetchAccount.
const UserProfileComponent = {
  name: "UserProfileComponent",
  props: {
    profileData: Object,
    // Optional: pass twist count from the parent view
    twistCount:  { type: Number, default: null }
  },
  computed: {
    joinDate() {
      if (!this.profileData?.created) return "";
      const d = new Date(this.profileData.created + "Z");
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    },
    safeWebsite() {
      const url = this.profileData?.website || "";
      try {
        const u = new URL(url.startsWith("http") ? url : "https://" + url);
        return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
      } catch { return ""; }
    },
    websiteLabel() {
      try {
        return new URL(this.safeWebsite).hostname.replace(/^www\./, "");
      } catch { return this.profileData?.website || ""; }
    },
    socialUrl() {
      return `#/@${this.profileData?.username}/social`;
    }
  },
  methods: {
    safeAvatarUrl(username) {
      return `https://steemitimages.com/u/${username}/avatar`;
    },
  },
  template: `
    <div v-if="profileData" style="max-width:600px;margin:0 auto 16px;">

      <!-- Card body — no cover image here (shown globally in header) -->
      <div style="
        background:#1e1535;border:1px solid #2e2050;
        border-radius:12px;padding:16px;
      ">
        <!-- Avatar row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <img
            :src="safeAvatarUrl(profileData.username)"
            style="width:72px;height:72px;border-radius:50%;border:3px solid #2e2050;background:#0f0a1e;flex-shrink:0;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar'"
          />
          <!-- Reputation badge -->
          <div style="
            background:linear-gradient(135deg,#8b2fc9,#e0187a);
            color:#fff;font-size:12px;font-weight:700;
            padding:3px 10px;border-radius:20px;
          " title="Steem reputation score">
            ⭐ {{ profileData.reputation }}
          </div>
        </div>

        <!-- Name + username -->
        <div style="margin-bottom:8px;">
          <div style="font-size:18px;font-weight:700;color:#e8e0f0;">{{ profileData.displayName }}</div>
          <div style="font-size:13px;color:#a855f7;">@{{ profileData.username }}</div>
        </div>

        <!-- Bio -->
        <div v-if="profileData.about" style="
          font-size:14px;color:#c0b0e0;line-height:1.5;margin-bottom:12px;
        ">{{ profileData.about }}</div>

        <!-- Meta row: location, website, joined -->
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#9b8db0;margin-bottom:14px;">
          <span v-if="profileData.location">
            📍 {{ profileData.location }}
          </span>
          <a
            v-if="safeWebsite"
            :href="safeWebsite"
            target="_blank"
            rel="noopener noreferrer"
            style="color:#22d3ee;text-decoration:none;"
          >🔗 {{ websiteLabel }}</a>
          <span v-if="joinDate">
            📅 Joined {{ joinDate }}
          </span>
        </div>

        <!-- Stats row -->
        <div style="
          display:flex;gap:0;border:1px solid #2e2050;border-radius:10px;
          overflow:hidden;text-align:center;
        ">
          <a
            :href="socialUrl + '?tab=followers'"
            style="flex:1;padding:10px 4px;text-decoration:none;border-right:1px solid #2e2050;
                   transition:background 0.15s;"
            @mouseenter="$event.currentTarget.style.background='#2e2050'"
            @mouseleave="$event.currentTarget.style.background=''"
          >
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.followerCount !== null ? profileData.followerCount.toLocaleString() : '—' }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Followers</div>
          </a>
          <a
            :href="socialUrl + '?tab=following'"
            style="flex:1;padding:10px 4px;text-decoration:none;border-right:1px solid #2e2050;
                   transition:background 0.15s;"
            @mouseenter="$event.currentTarget.style.background='#2e2050'"
            @mouseleave="$event.currentTarget.style.background=''"
          >
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.followingCount !== null ? profileData.followingCount.toLocaleString() : '—' }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Following</div>
          </a>
          <div style="flex:1;padding:10px 4px;">
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.postCount.toLocaleString() }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Posts</div>
          </div>
          <div v-if="twistCount !== null" style="flex:1;padding:10px 4px;border-left:1px solid #2e2050;">
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ twistCount.toLocaleString() }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Twists</div>
          </div>
        </div>

      </div>
    </div>
  `
};

// ---- LoadingSpinnerComponent ----
// Simple centred loading indicator. Show while async data is being fetched.
const LoadingSpinnerComponent = {
  name: "LoadingSpinnerComponent",
  props: {
    message: { type: String, default: "Loading..." }
  },
  template: `
    <div style="text-align:center;padding:30px;color:#5a4e70;">
      <div style="
        display:inline-block;width:32px;height:32px;
        border:4px solid #2e2050;border-top-color:#a855f7;
        border-radius:50%;animation:spin 0.8s linear infinite;
      "></div>
      <p style="margin-top:10px;font-size:14px;">{{ message }}</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
};

// ============================================================
// STEEMTWIST COMPONENTS
// ============================================================

// Body longer than this, or children count above THREAD_REPLY_THRESHOLD,
// triggers collapsed thread mode. Matches the composer limit so native
// twists never collapse.
const PREVIEW_LENGTH       = 280;
const THREAD_REPLY_THRESHOLD = 3;

// Shared markdown renderer — configured once, reused everywhere.
// marked.parse() is synchronous and returns sanitised HTML.
const markedOptions = { breaks: true, gfm: true };
function renderMarkdown(text) {
  if (!text) return "";
  return marked.parse(text, markedOptions);
}

// Strip the SteemTwist back-link appended by buildZeroPayoutOps before
// rendering. The link takes the form:
//   \n\n<sub>Posted via [SteemTwist](...)</sub>
// Matching on the opening <sub>Posted via is sufficient and tolerates any URL.
function stripBackLink(text) {
  if (!text) return "";
  return text.replace(/\n+<sub>Posted via \[SteemTwist\][^\n]*/i, "").trimEnd();
}

// ---- ReplyCardComponent ----
// Renders a single reply with its own compose box and a recursive
// ThreadComponent for its children. Declared before ThreadComponent
// so the two can reference each other via the global component registry.
const ReplyCardComponent = {
  name: "ReplyCardComponent",
  inject: ["username", "hasKeychain"],
  props: {
    reply: { type: Object, required: true },
    depth: { type: Number, default: 0 }
  },
  data() {
    return {
      showReplyBox:     false,
      replyPreviewMode: false,
      // Auto-expand the first two nesting levels (depth 0 and 1).
      showChildren:  this.depth < 2,
      replyText:     draftStorage.load("reply_" + this.reply.permlink, ""),
      isReplying:    false,
      isVoting:      false,
      hasVoted:      false,
      isRetwisting:  false,
      hasRetwisted:  false,
      replyCount:    this.reply.children || 0,
      lastError:     "",
      showEditBox:   false,
      editText:      "",
      isEditing:     false,
      showDeleteConfirm: false,
      isDeleting:    false,
      editedBody:    null
    };
  },
  computed: {
    isOwnReply() {
      return !!this.username && this.username === this.reply.author;
    },
    avatarUrl() {
      return `https://steemitimages.com/u/${this.reply.author}/avatar/small`;
    },
    relativeTime() {
      const diff = Date.now() - steemDate(this.reply.created).getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    absoluteTime() {
      const d = steemDate(this.reply.created);
      if (isNaN(d)) return "";
      return d.toUTCString().replace(" GMT", " UTC");
    },
    replyUrl() {
      return `#/@${this.reply.author}/${this.reply.permlink}`;
    },
    bodyHtml() { return DOMPurify.sanitize(renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.reply.body))); },
    replyPreviewHtml() {
      return this.replyText.trim()
        ? DOMPurify.sanitize(renderMarkdown(this.replyText))
        : "<em style='color:#5a4e70'>Nothing to preview.</em>";
    },
    canAct()   { return !!this.username && this.hasKeychain; },
    indent()   { return Math.min(this.depth, 4) * 16; },
    
    upvoteCount() {
  const votes = this.reply.active_votes;

  if (!votes) return this.hasVoted ? 1 : 0;

  const count = votes.filter(v => v.percent > 0).length;

  return count + (this.hasVoted ? 1 : 0);
}
  },
  watch: {
    replyText(v) { draftStorage.save("reply_" + this.reply.permlink, v); }
  },
    methods: {
    vote() {
      if (!this.canAct || this.isVoting || this.hasVoted) return;
      this.isVoting = true;
      voteTwist(this.username, this.reply.author, this.reply.permlink, 10000, (res) => {
        this.isVoting = false;
        if (res.success) {
          this.hasVoted = true;
        } else {
          this.lastError = res.error || res.message || "Vote failed.";
        }
      });
    },
    retwist() {
      if (!this.canAct || this.isRetwisting || this.hasRetwisted) return;
      if (this.reply.author === this.username) {
        this.lastError = "You cannot retwist your own twist.";
        return;
      }
      this.isRetwisting = true;
      retwistPost(this.username, this.reply.author, this.reply.permlink, (res) => {
        this.isRetwisting = false;
        if (res.success) {
          this.hasRetwisted = true;
        } else {
          this.lastError = res.error || res.message || "Retwist failed.";
        }
      });
    },
    toggleReplies() {
      if (this.replyCount > 0) this.showChildren = !this.showChildren;
      if (this.canAct)         this.showReplyBox  = !this.showReplyBox;
    },
    submitReply() {
      const text = this.replyText.trim();
      if (!text || !this.canAct) return;
      this.isReplying = true;
      postTwistReply(this.username, text, this.reply.author, this.reply.permlink, (res) => {
        this.isReplying = false;
        if (res.success) {
          this.replyText        = "";
          this.replyPreviewMode = false;
          this.showChildren     = true;
          this.replyCount++;
          draftStorage.clear("reply_" + this.reply.permlink);
        } else {
          this.lastError = res.error || res.message || "Reply failed.";
        }
      });
    },

    openEdit() {
      this.editText    = stripBackLink(this.editedBody !== null ? this.editedBody : this.reply.body);
      this.showEditBox = true;
    },
    saveEdit() {
      const text = this.editText.trim();
      if (!text || this.isEditing) return;
      this.isEditing = true;
      editTwist(this.username, this.reply, text, (res) => {
        this.isEditing = false;
        if (res.success) {
          this.editedBody  = text;
          this.showEditBox = false;
        } else {
          this.lastError = res.error || res.message || "Edit failed.";
        }
      });
    },
    confirmDelete() { this.showDeleteConfirm = true; },
    doDelete() {
      if (this.isDeleting) return;
      this.isDeleting = true;
      deleteTwist(this.username, this.reply, (res) => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        if (res.success) {
          this.$emit("deleted", this.reply);
        } else {
          this.lastError = res.error || res.message || "Delete failed.";
        }
      });
    }
  },
  template: `
    <div :style="{ paddingLeft: indent + 'px' }">
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #2e2050;">

        <!-- Avatar -->
        <a :href="'#/@' + reply.author" style="flex-shrink:0;">
          <img
            :src="avatarUrl"
            style="width:28px;height:28px;border-radius:50%;border:2px solid #2e2050;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>

        <!-- Content -->
        <div style="flex:1;min-width:0;">

          <!-- Header -->
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
            <a
              :href="'#/@' + reply.author"
              style="font-weight:bold;color:#a855f7;text-decoration:none;font-size:13px;"
            >@{{ reply.author }}</a>
            <!-- Timestamp linked to the reply's own page; absolute time on hover -->
            <a
              :href="replyUrl"
              :title="absoluteTime"
              style="font-size:11px;color:#5a4e70;text-decoration:none;"
            >{{ relativeTime }}</a>
          </div>

          <!-- Body -->
          <div class="twist-body" style="font-size:14px;" v-html="bodyHtml"></div>

          <!-- Actions: love + retwist + reply + permalink -->
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap;">

            <!-- Love -->
            <button
              @click="vote"
              :disabled="!canAct || isVoting || hasVoted"
              :style="{
                background: hasVoted ? '#3b0764' : '#1e1535',
                color: hasVoted ? '#e879f9' : '#9b8db0',
                border: hasVoted ? '1px solid #a855f7' : '1px solid #2e2050',
                borderRadius: '20px', padding: '2px 10px',
                cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
                fontSize: '12px'
              }"
            >{{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}</button>

            <!-- Retwist -->
            <button
              @click="retwist"
              :disabled="!canAct || isRetwisting || hasRetwisted || reply.author === username"
              :style="{
                background: hasRetwisted ? '#0c2d1a' : '#1e1535',
                color:      hasRetwisted ? '#4ade80'  : '#9b8db0',
                border:     hasRetwisted ? '1px solid #166534' : '1px solid #2e2050',
                borderRadius: '20px', padding: '2px 10px',
                cursor: (!canAct || hasRetwisted || reply.author === username) ? 'default' : 'pointer',
                fontSize: '12px'
              }"
              :title="reply.author === username ? 'Cannot retwist your own twist' : ''"
            >{{ isRetwisting ? "…" : (hasRetwisted ? "🔁 Retwisted" : "🔁") }}</button>

            <!-- Reply -->
            <button
              @click="toggleReplies"
              style="
                background:none;border:none;padding:0;margin:0;
                color:#a855f7;font-size:12px;cursor:pointer;
                text-decoration:underline;font-weight:600;
              "
            >
              💬 {{ replyCount > 0 ? replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') : 'Reply' }}
            </button>

            <!-- Permalink -->
            <a
              :href="replyUrl"
              style="font-size:11px;color:#5a4e70;text-decoration:none;"
              title="Open reply page"
            >🔗</a>

            <!-- Edit / Delete — own replies only -->
            <button
              v-if="isOwnReply && hasKeychain"
              @click="openEdit"
              style="background:none;border:none;padding:0;font-size:12px;
                     color:#5a4e70;cursor:pointer;"
              title="Edit this reply"
            >✏️</button>

            <button
              v-if="isOwnReply && hasKeychain"
              @click="confirmDelete"
              style="background:none;border:none;padding:0;font-size:12px;
                     color:#5a4e70;cursor:pointer;"
              title="Delete this reply"
            >🗑️</button>

          </div>

          <!-- Inline edit box -->
          <div v-if="showEditBox" style="margin-top:8px;">
            <textarea
              v-model="editText"
              style="
                width:100%;box-sizing:border-box;padding:7px;border-radius:8px;
                border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;
                font-size:13px;resize:vertical;min-height:52px;
              "
              @keydown.ctrl.enter="saveEdit"
            ></textarea>
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
              <button
                @click="showEditBox = false"
                style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                       border-radius:20px;padding:2px 10px;font-size:12px;margin:0;"
              >Cancel</button>
              <button
                @click="saveEdit"
                :disabled="!editText.trim() || isEditing"
                style="padding:2px 12px;font-size:12px;margin:0;"
              >{{ isEditing ? "Saving…" : "Save" }}</button>
            </div>
          </div>

          <!-- Delete confirmation -->
          <div v-if="showDeleteConfirm" style="
            margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;
            background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
          ">
            <div style="margin-bottom:6px;">Delete this reply?</div>
            <div style="display:flex;gap:6px;">
              <button
                @click="doDelete"
                :disabled="isDeleting"
                style="background:#7f1d1d;border:none;color:#fff;border-radius:20px;
                       padding:2px 12px;font-size:12px;margin:0;"
              >{{ isDeleting ? "…" : "Delete" }}</button>
              <button
                @click="showDeleteConfirm = false"
                style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                       border-radius:20px;padding:2px 10px;font-size:12px;margin:0;"
              >Cancel</button>
            </div>
          </div>

          <!-- Compose box -->
          <div v-if="showReplyBox && canAct" style="margin-top:8px;">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <button
                @click="replyPreviewMode = false"
                :style="{
                  background: !replyPreviewMode ? '#2e2050' : 'none',
                  color:      !replyPreviewMode ? '#e8e0f0' : '#9b8db0',
                  border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
                  padding:'2px 8px', fontSize:'11px', margin:0, cursor:'pointer'
                }"
              >Write</button>
              <button
                @click="replyPreviewMode = true"
                :style="{
                  background: replyPreviewMode ? '#2e2050' : 'none',
                  color:      replyPreviewMode ? '#e8e0f0' : '#9b8db0',
                  border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
                  padding:'2px 8px', fontSize:'11px', margin:0, cursor:'pointer'
                }"
              >Preview</button>
            </div>
            <textarea
              v-show="!replyPreviewMode"
              v-model="replyText"
              placeholder="Write a reply… (markdown supported)"
              maxlength="1000"
              style="
                width:100%;box-sizing:border-box;
                padding:7px;border-radius:0 8px 8px 8px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;
                font-size:13px;resize:vertical;min-height:52px;
              "
            ></textarea>
            <div
              v-show="replyPreviewMode"
              class="twist-body"
              v-html="replyPreviewHtml"
              style="
                min-height:52px;padding:7px;border-radius:0 8px 8px 8px;
                border:1px solid #2e2050;background:#0f0a1e;
                font-size:13px;color:#e8e0f0;line-height:1.6;word-break:break-word;
              "
            ></div>
            <div style="text-align:right;margin-top:4px;">
              <button
                @click="submitReply"
                :disabled="!replyText.trim() || isReplying"
                style="font-size:12px;padding:4px 12px;"
              >{{ isReplying ? "Posting…" : "Reply" }}</button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="lastError" style="
            margin-top:6px;padding:6px 8px;border-radius:6px;font-size:12px;
            background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
            display:flex;justify-content:space-between;align-items:center;
          ">
            <span>⚠️ {{ lastError }}</span>
            <button
              @click="lastError = ''"
              style="background:none;border:none;cursor:pointer;font-size:14px;
                     padding:0;color:#fca5a5;line-height:1;"
            >✕</button>
          </div>

          <!-- Nested children -->
          <thread-component
            v-if="showChildren"
            :author="reply.author"
            :permlink="reply.permlink"
            :depth="depth + 1"
          ></thread-component>

        </div>
      </div>
    </div>
  `
};

// ---- ThreadComponent ----
// Lazy-loads direct replies and renders each as a ReplyCardComponent.
// Used recursively: TwistCardComponent → ThreadComponent → ReplyCardComponent
//                                                        → ThreadComponent → …
const ThreadComponent = {
  name: "ThreadComponent",
  components: { ReplyCardComponent },
  props: {
    author:   { type: String,  required: true },
    permlink: { type: String,  required: true },
    depth:    { type: Number,  default: 0 }
  },
  data() {
    return {
      replies:   [],
      loading:   true,
      loadError: ""
    };
  },
  async created() {
    try {
      const replies = await fetchReplies(this.author, this.permlink);
      // getContentReplies returns empty active_votes (a Steem node quirk that
      // affects both the feed root and individual posts). Enrich active_votes
      // only via a parallel getContent call so the Love count is correct.
      // All other fields (body, children, etc.) are already populated.
      this.replies = await Promise.all(
        replies.map(r =>
          fetchPost(r.author, r.permlink)
            .then(full => ({ ...r, active_votes: full.active_votes || [] }))
            .catch(() => r)
        )
      );
    } catch (e) {
      this.loadError = "Could not load replies.";
    }
    this.loading = false;
  },
  template: `
    <div style="margin-top:8px;border-top:2px solid #2e2050;padding-top:8px;">

      <div v-if="loading" style="color:#5a4e70;font-size:13px;padding:6px 0;">
        Loading replies…
      </div>

      <div v-else-if="loadError" style="color:#fca5a5;font-size:13px;">
        ⚠️ {{ loadError }}
      </div>

      <div v-else-if="replies.length === 0" style="color:#5a4e70;font-size:13px;">
        No replies yet.
      </div>

      <reply-card-component
        v-else
        v-for="reply in replies"
        :key="reply.permlink"
        :reply="reply"
        :depth="depth"
      ></reply-card-component>

    </div>
  `
};

// ---- LiveTwistComponent ----
// Renders a "Live Twist" — user-authored JavaScript running in a strict
// iframe sandbox. The sandbox has NO access to the parent page, the wallet,
// cookies, localStorage, or the network.
//
// Security layers (defence-in-depth):
//   1. <iframe sandbox="allow-scripts"> — isolated null origin, no same-origin
//   2. DOMPurify sanitises every HTML string the code tries to render
//   3. fetch / XHR / WebSocket overridden to throw inside the iframe
//   4. 2-second execution timeout kills runaway code
//   5. User must click ▶ Run — never auto-executed
//   6. Payload size limit: 10 KB (enforced before Run is allowed)
//   7. Parent validates event.origin === "null" on every message
//
// Live Twist json_metadata shape:
//   { type: "live_twist", version: 1, code: "<JS string>", title: "My App" }
//   `code` receives a single argument `app` with the restricted API.
//
// Restricted API (app.*):
//   app.render(html)  — sanitise + set body innerHTML
//   app.text(str)     — set body as plain text (no HTML)
//   app.resize(h)     — tell parent to resize the iframe
//   app.log(msg)      — append a line to the built-in console panel
//
const LiveTwistComponent = {
  name: "LiveTwistComponent",
  inject: ["username", "hasKeychain", "notify", "voteTwist", "postTwistReply", "retwistPost", "followUser", "unfollowUser"],
  props: {
    post: { type: Object, required: true }
  },
  data() {
    return {
      running:    false,
      error:      "",
      iframeKey:  0   // increment to force iframe recreation on re-run
    };
  },
  computed: {
    meta() {
      try {
        const raw = this.post.json_metadata;
        return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
      } catch { return {}; }
    },
    code()    { return (this.meta.code  || "").trim(); },
    title()   { return (this.meta.title || "Live Twist").trim(); },
    codeSize(){ return new TextEncoder().encode(this.code).length; },
    tooBig()  { return this.codeSize > 10240; },   // 10 KB limit
    // The srcdoc injected into the sandboxed iframe.
    // DOMPurify is inlined so the iframe never needs to load external scripts.
    sandboxDoc() {
      // We encode the user code as a JSON string so it survives
      // the srcdoc attribute escaping without any eval trickery.
      const escapedCode = JSON.stringify(this.code);
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:8px; font-family:system-ui,sans-serif;
         font-size:14px; background:#0f0a1e; color:#e8e0f0;
         box-sizing:border-box; word-break:break-word; }
  * { box-sizing:border-box; }
  button { cursor:pointer; padding:5px 12px; border-radius:6px;
           background:#6d28d9; color:#fff; border:none; font-size:13px; }
  input,textarea { background:#1a1030; color:#e8e0f0; border:1px solid #3b1f5e;
                   border-radius:6px; padding:5px 8px; font-size:13px; width:100%; }
  #_console { margin-top:8px; padding:6px; background:#0a0616;
              border-radius:6px; font-family:monospace; font-size:12px;
              color:#9b8db0; max-height:80px; overflow-y:auto;
              border:1px solid #2e1060; display:none; }
</style>
</head>
<body>
<div id="_root"></div>
<div id="_console"></div>
<script>
(function() {
  // ── Kill the network ─────────────────────────────────────────
  window.fetch       = () => Promise.reject(new Error("Network blocked"));
  window.XMLHttpRequest = function() { throw new Error("Network blocked"); };
  window.WebSocket   = function() { throw new Error("Network blocked"); };
  window.open        = () => null;

  // ── Inline DOMPurify (subset — full lib loaded from parent message) ──
  // We receive it via message bridge. Until then, use a strict allowlist.
  let purify = null;

  function sanitize(html) {
    if (typeof html !== "string") return "";
    if (purify) return purify.sanitize(html, {
      ALLOWED_TAGS: ["div","span","p","br","b","i","strong","em","u","s",
                     "h1","h2","h3","h4","ul","ol","li","pre","code",
                     "table","thead","tbody","tr","th","td","button",
                     "input","textarea","label","select","option",
                     "hr","blockquote","a","img"],
      ALLOWED_ATTR: ["id","class","style","type","value","placeholder",
                     "checked","disabled","readonly","href","src","alt",
                     "width","height","rows","cols","for","name","max",
                     "min","step","multiple"],
      FORBID_TAGS:  ["script","iframe","object","embed","form","frame"],
      FORBID_ATTR:  ["onclick","onerror","onload","onmouseover","onfocus",
                     "onblur","onchange","onsubmit"]
    });
    // Sandbox is already fully isolated — return html as-is when DOMPurify unavailable
    return html;
  }

  // ── Restricted API exposed to Live Twist code ─────────────────
  const _cons = document.getElementById("_console");
  const _root = document.getElementById("_root");

  const app = {
    render(html) {
      _root.innerHTML = sanitize(String(html));
    },
    text(str) {
      _root.textContent = String(str).slice(0, 2000);
    },
    resize(h) {
      const height = Math.min(Math.max(parseInt(h) || 200, 40), 600);
      parent.postMessage({ type: "resize", height }, "*");
    },
    log(...args) {
      _cons.style.display = "block";
      const line = document.createElement("div");
      line.textContent = args.map(a =>
        typeof a === "object" ? JSON.stringify(a) : String(a)
      ).join(" ");
      _cons.appendChild(line);
      _cons.scrollTop = _cons.scrollHeight;
    },
    // --- Actions to access blockchain ---
    action(type, params = {}) {
      parent.postMessage({ 
        type: "LIVE_TWIST_ACTION", 
        actionType: type, 
        params: params 
      }, "*");
    },
    onResult(callback) {
      window.addEventListener("message", (e) => {
        if (e.data.type === "ACTION_RESULT") {
          callback(e.data.success, e.data.action);
        }
      });
    }
  };

  // ── Receive DOMPurify + run signal from parent ────────────────
  window.addEventListener("message", function(e) {
    if (e.data && e.data.type === "purify") {
      // Parent sends DOMPurify source; eval it inside sandbox
      try { (new Function(e.data.src))(); purify = DOMPurify; } catch {}
      return;
    }
    if (e.data && e.data.type === "kill") {
      _root.innerHTML = "<em style='color:#fca5a5'>Execution timed out.</em>";
      return;
    }
  });

  // ── Execute user code ─────────────────────────────────────────
  const userCode = ${escapedCode};
  try {
    const fn = new Function("app", userCode);
    const result = fn(app);
    // Support async code
    if (result && typeof result.catch === "function") {
      result.catch(err => {
        _root.innerHTML = "<em style='color:#fca5a5'>Error: " +
          String(err).replace(/</g,"&lt;") + "</em>";
      });
    }
    // Signal parent that execution started
    parent.postMessage({ type: "running" }, "*");
  } catch (err) {
    _root.innerHTML = "<em style='color:#fca5a5'>Error: " +
      String(err).replace(/</g,"&lt;") + "</em>";
    parent.postMessage({ type: "error", message: String(err) }, "*");
  }

  // Auto-resize based on content height
  setTimeout(() => {
    const h = document.body.scrollHeight;
    if (h > 40) parent.postMessage({ type: "resize", height: h + 16 }, "*");
  }, 100);
})();
${'<'}/script>
</body>
</html>`;
    }
  },
  methods: {
    run() {
      if (this.tooBig) {
        this.error = "Live Twist code exceeds the 10 KB size limit.";
        return;
      }
      this.error   = "";
      this.running = true;
      this.iframeKey++;  // forces Vue to recreate the iframe element
    },

    stop() {
      this.running  = false;
      this.iframeKey++;
    },

    onMessage(e) {
      // Only accept messages from the sandboxed iframe (origin === "null")
      if (e.origin !== "null") return;
      const { type, height } = e.data || {};
      if (type === "resize" && height) {
        const iframe = this.$refs.sandbox;
        if (iframe) iframe.style.height = Math.min(height, 600) + "px";
      }
      // --- HANDLE ACTIONS to access blockchain ---
      if (type === "LIVE_TWIST_ACTION") {
        this.handleActionRequest(actionType, params);
      }
    },

    // Helper method to HANDLE ACTIONS to access blockchain
    handleActionRequest(action, params) {
      // Helper to message the specific iframe running this twist
      const sendBack = (success) => {
        const iframe = this.$refs.sandbox;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ 
            type: "ACTION_RESULT", 
            success: success, 
            action: action 
          }, "*");
        }
      };
      // Check the global window object for Keychain
      if (!window.steem_keychain) {
        this.notify("Steem Keychain extension is not installed.", "error");
        return;
      }
      // Access injected Vue state via 'this'
      const currentUsername = this.username; 
      if (!currentUsername) {
        this.notify("Please log in first to use this Live Twist feature.", "error");
        return;
      }
      // User confirmation (The Firewall)
      const confirmed = confirm(`This Live Twist wants to: ${action}\n\nData: ${JSON.stringify(params)}\n\nAllow this?`);
      if (!confirmed) return;

      // Map actions to actual Steem logic
      if (action === "vote") {
        // We can use inject/provide or a global call here
        this.voteTwist(currentUsername, params.permlink, params.author, parseInt(params.weight || 10000), function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);          
        });
      } else if (action === "reply") {
        this.postTwistReply(currentUsername, params.message, params.parentAuthor, params.parentPermlink, function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else if (action === "retwist") {
        this.retwistPost(currentUsername, params.author, params.permlink, function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else if (action === "follow") {
        this.followUser(currentUsername, params.following, function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else if (action === "unfollow") {
        this.unfollowUser(currentUsername, params.following, function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else if (action === "transfer") {
        window.steem_keychain.requestTransfer(currentUsername, params.to, params.amount, params.memo || "", params.currency || "STEEM", function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else if (action === "delegate") {
        window.steem_keychain.requestDelegation(currentUsername, params.delegatee, params.amount, params.unit || "VEST", function(res) {
          if (res.success) {
            this.notify(action + " succeeded", "success");
          } else {
            this.notify(res.error || res.message || action + " failed.", "error");
          }
          sendBack(res.success);
        });
      } else {
        console.log(action + " is unsupported.");
      }
    }
  },

  mounted() {
    window.addEventListener("message", this.onMessage);
  },
  unmounted() {
    window.removeEventListener("message", this.onMessage);
  },

  template: `
    <div style="
      background:#0f0a1e;border:1px solid #2e1060;border-radius:8px;
      overflow:hidden;margin-top:4px;
    ">
      <!-- Header bar -->
      <div style="
        display:flex;align-items:center;justify-content:space-between;
        padding:6px 10px;background:#1a1030;border-bottom:1px solid #2e1060;
      ">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">⚡</span>
          <span style="font-size:13px;font-weight:600;color:#c084fc;">{{ title }}</span>
          <span style="font-size:11px;color:#5a4e70;">Live Twist</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span v-if="tooBig" style="font-size:11px;color:#fca5a5;">⚠ Too large</span>
          <span v-else style="font-size:11px;color:#5a4e70;">{{ (codeSize/1024).toFixed(1) }} KB</span>
          <button
            v-if="!running"
            @click="run"
            :disabled="tooBig"
            style="
              background:linear-gradient(135deg,#6d28d9,#e0187a);
              color:#fff;border:none;border-radius:6px;
              padding:3px 12px;font-size:12px;font-weight:600;margin:0;cursor:pointer;
            "
          >▶ Run</button>
          <button
            v-else
            @click="stop"
            style="
              background:#2d0a0a;color:#fca5a5;border:1px solid #7f1d1d;
              border-radius:6px;padding:3px 12px;font-size:12px;margin:0;cursor:pointer;
            "
          >■ Stop</button>
        </div>
      </div>

      <!-- Sandbox iframe (only mounted when running) -->
      <div v-if="running" style="padding:0;">
        <iframe
          :key="iframeKey"
          ref="sandbox"
          sandbox="allow-scripts"
          :srcdoc="sandboxDoc"
          style="
            width:100%;border:none;display:block;
            min-height:60px;height:200px;
            background:#0f0a1e;
          "
          scrolling="no"
        ></iframe>
      </div>

      <!-- Idle placeholder -->
      <div v-else style="
        padding:12px;font-size:13px;color:#5a4e70;font-style:italic;
      ">
        Click ▶ Run to execute this Live Twist in a secure sandbox.
      </div>

      <!-- Error message -->
      <div v-if="error" style="
        padding:8px 10px;font-size:12px;color:#fca5a5;
        background:#2d0a0a;border-top:1px solid #7f1d1d;
      ">⚠️ {{ error }}</div>

      <!-- Security notice -->
      <div style="
        padding:4px 10px;font-size:11px;color:#3b2060;
        border-top:1px solid #1a0a30;
      ">
        🔒 Runs in isolated sandbox — no wallet, network, or page access
      </div>
    </div>
  `
};

// ---- TwistCardComponent ----
// Renders a single twist.
// Long-body posts (> PREVIEW_LENGTH) or busy threads (children > THREAD_REPLY_THRESHOLD)
// are shown collapsed with a preview and an "Expand thread" button.
// The 💬 reply button independently toggles ThreadComponent for any post that has replies,
// fixing the case where short posts with replies never showed them.
const TwistCardComponent = {
  name: "TwistCardComponent",
  components: { ThreadComponent, LiveTwistComponent },
  props: {
    post:        { type: Object,  required: true },
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    pinned:      { type: Boolean, default: false }   // true when this card is the pinned twist
  },
  emits: ["voted", "replied", "pin", "unpin", "deleted"],
  data() {
    return {
      showReplyBox:     false,
      replyPreviewMode: false,
      // Auto-expand replies if the post already has some.
      showReplies:     (this.post.children || 0) > 0,
      replyText:       draftStorage.load("reply_" + this.post.permlink, ""),
      isReplying:      false,
      isVoting:        false,
      hasVoted:        false,
      isRetwisting:    false,
      hasRetwisted:    false,
      replyCount:      this.post.children || 0,
      lastError:       "",
      threadExpanded:  false,
      isPinning:       false,
      showEditBox:     false,
      isLiveEditBox:   false,   // true when editing a Live Twist
      editText:        "",
      editCode:        "",      // live twist code being edited
      editTitle:       "",      // live twist card label being edited
      editBody:        "",      // live twist body being edited
      isEditing:       false,
      showDeleteConfirm: false,
      isDeleting:      false,
      editedBody:      null,    // local override after successful edit
      editedCode:      null     // local code override after live twist edit
    };
  },
  computed: {
    isOwnPost() {
      return !!this.username && this.username === this.post.author;
    },
    isSecretTwist() {
      try { return JSON.parse(this.post.json_metadata || "{}").type === "secret_twist"; }
      catch { return false; }
    },
    isLiveTwist() {
      try {
        const raw = this.post.json_metadata;
        const meta = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
        return meta.type === "live_twist" && !!meta.code;
      } catch { return false; }
    },
    avatarUrl() {
      return `https://steemitimages.com/u/${this.post.author}/avatar/small`;
    },
    relativeTime() {
      const diff = Date.now() - steemDate(this.post.created).getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    // Full UTC timestamp shown as tooltip and on the twist page link
    absoluteTime() {
      const d = steemDate(this.post.created);
      if (isNaN(d)) return "";
      return d.toUTCString().replace(" GMT", " UTC");
    },
    // Hash-router link to the dedicated twist page
    twistUrl() {
      return `#/@${this.post.author}/${this.post.permlink}`;
    },
    upvoteCount() {
      const votes = this.post.active_votes || [];
      // active_votes is only populated by getContent (single post fetch).
      // getContentReplies returns it empty, so fall back to net_votes which
      // is always present and equals upvotes minus downvotes.
      const count = votes.length > 0
        ? votes.filter(v => v.percent > 0).length
        : Math.max(0, this.post.net_votes || 0);
      return count + (this.hasVoted ? 1 : 0);
    },
    canAct() {
      return !!this.username && this.hasKeychain;
    },
    isLong() {
      return stripBackLink(this.post.body).length > PREVIEW_LENGTH ||
             (this.post.children || 0) > THREAD_REPLY_THRESHOLD;
    },
    bodyPreview() {
      return stripBackLink(this.post.body).slice(0, PREVIEW_LENGTH) + "…";
    },
    bodyHtml() {
      if (this.isSecretTwist) return "<em style='color:#5a4e70'>🔒 Secret Twist — view in Private Signals</em>";
      if (this.isLiveTwist)   return "";   // rendered by LiveTwistComponent
      return DOMPurify.sanitize(renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body)));
    },
    bodyPreviewHtml() {
      if (this.isSecretTwist) return "<em style='color:#5a4e70'>🔒 Secret Twist — view in Private Signals</em>";
      if (this.isLiveTwist)   return "";
      return DOMPurify.sanitize(renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body).slice(0, PREVIEW_LENGTH) + "…"));
    },
    replyPreviewHtml() {
      return this.replyText.trim()
        ? DOMPurify.sanitize(renderMarkdown(this.replyText))
        : "<em style='color:#5a4e70'>Nothing to preview.</em>";
    },
    showThread() {
      return this.threadExpanded || this.showReplies;
    }
  },
  watch: {
    replyText(v) { draftStorage.save("reply_" + this.post.permlink, v); },
    editText(v)  { if (this.showEditBox) draftStorage.save("edit_" + this.post.permlink, { editText: v }); },
    editCode(v)  { if (this.isLiveEditBox) draftStorage.save("live_edit_" + this.post.permlink, { editCode: v, editTitle: this.editTitle, editBody: this.editBody }); },
    editTitle(v) { if (this.isLiveEditBox) draftStorage.save("live_edit_" + this.post.permlink, { editCode: this.editCode, editTitle: v, editBody: this.editBody }); },
    editBody(v)  { if (this.isLiveEditBox) draftStorage.save("live_edit_" + this.post.permlink, { editCode: this.editCode, editTitle: this.editTitle, editBody: v }); }
  },
  methods: {
    vote() {
      if (!this.canAct || this.isVoting || this.hasVoted) return;
      this.isVoting = true;
      voteTwist(this.username, this.post.author, this.post.permlink, 10000, (res) => {
        this.isVoting = false;
        if (res.success) {
          this.hasVoted = true;
          this.$emit("voted", this.post);
        } else {
          this.lastError = res.error || res.message || "Twist love failed.";
        }
      });
    },
    retwist() {
      if (!this.canAct || this.isRetwisting || this.hasRetwisted) return;
      // Cannot retwist your own post
      if (this.post.author === this.username) {
        this.lastError = "You cannot retwist your own twist.";
        return;
      }
      this.isRetwisting = true;
      retwistPost(this.username, this.post.author, this.post.permlink, (res) => {
        this.isRetwisting = false;
        if (res.success) {
          this.hasRetwisted = true;
        } else {
          this.lastError = res.error || res.message || "Retwist failed.";
        }
      });
    },
    toggleReplies() {
      // Always toggle the reply list — even if replyCount is 0, the user
      // may want to see "No replies yet" or post the first reply.
      // This also fixes the case where children=0 but replies exist on-chain.
      this.showReplies = !this.showReplies;
      if (this.canAct) {
        this.showReplyBox = !this.showReplyBox;
      }
    },
    pinPost() {
      if (!this.isOwnPost || this.isPinning) return;
      this.isPinning = true;
      pinTwist(this.username, this.post.author, this.post.permlink, (res) => {
        this.isPinning = false;
        if (res.success) this.$emit("pin", this.post);
        else this.lastError = res.error || res.message || "Pin failed.";
      });
    },
    unpinPost() {
      if (!this.isOwnPost || this.isPinning) return;
      this.isPinning = true;
      unpinTwist(this.username, (res) => {
        this.isPinning = false;
        if (res.success) this.$emit("unpin", this.post);
        else this.lastError = res.error || res.message || "Unpin failed.";
      });
    },
    submitReply() {
      const text = this.replyText.trim();
      if (!text || !this.canAct) return;
      this.isReplying = true;
      postTwistReply(this.username, text, this.post.author, this.post.permlink, (res) => {
        this.isReplying = false;
        if (res.success) {
          this.replyText        = "";
          this.replyPreviewMode = false;
          this.showReplies      = true;
          this.replyCount++;
          draftStorage.clear("reply_" + this.post.permlink);
          this.$emit("replied", this.post);
        } else {
          this.lastError = res.error || res.message || "Reply failed.";
        }
      });
    },

    openEdit() {
      if (this.isLiveTwist) {
        const raw = this.post.json_metadata;
        const meta = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
        const savedLive = draftStorage.load("live_edit_" + this.post.permlink, {});
        this.editCode      = savedLive.editCode  !== undefined ? savedLive.editCode  : (this.editedCode !== null ? this.editedCode : (meta.code || ""));
        this.editTitle     = savedLive.editTitle !== undefined ? savedLive.editTitle : (meta.title || "");
        this.editBody      = savedLive.editBody  !== undefined ? savedLive.editBody  : stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body);
        this.isLiveEditBox = true;
      } else {
        const saved = draftStorage.load("edit_" + this.post.permlink, {});
        this.editText    = saved.editText !== undefined ? saved.editText : stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body);
        this.showEditBox = true;
      }
    },
    saveEdit() {
      const text = this.editText.trim();
      if (!text || this.isEditing) return;
      this.isEditing = true;
      editTwist(this.username, this.post, text, (res) => {
        this.isEditing = false;
        if (res.success) {
          this.editedBody  = text;
          this.showEditBox = false;
          draftStorage.clear("edit_" + this.post.permlink);
        } else {
          this.lastError = res.error || res.message || "Edit failed.";
        }
      });
    },
    saveLiveEdit() {
      const c = this.editCode.trim();
      if (!c || this.isEditing) return;
      this.isEditing = true;
      // Re-broadcast with updated json_metadata containing the new code
      const raw = this.post.json_metadata;
      const meta = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
      const newMeta = Object.assign({}, meta, {
        title: this.editTitle.trim() || "Live Twist",
        code:  c
      });
      // Use editTwist which re-broadcasts the comment op — body stays the same
      const fakePost = Object.assign({}, this.post, {
        json_metadata: JSON.stringify(newMeta)
      });
      const bodyText = this.editBody.trim() || "⚡ Live Twist — view on SteemTwist";
      editTwist(this.username, fakePost, bodyText, (res) => {
        this.isEditing = false;
        if (res.success) {
          this.editedCode    = c;
          this.isLiveEditBox = false;
          this.post.json_metadata = JSON.stringify(newMeta);
          draftStorage.clear("live_edit_" + this.post.permlink);
        } else {
          this.lastError = res.error || res.message || "Edit failed.";
        }
      });
    },
    confirmDelete() {
      this.showDeleteConfirm = true;
    },
    doDelete() {
      if (this.isDeleting) return;
      this.isDeleting = true;
      deleteTwist(this.username, this.post, (res) => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        if (res.success) {
          this.$emit("deleted", this.post);
        } else {
          this.lastError = res.error || res.message || "Delete failed.";
        }
      });
    }
  },
  template: `
    <div style="
      background:#1e1535;border:1px solid #2e2050;border-radius:12px;
      padding:14px 16px;margin:10px auto;max-width:600px;text-align:left;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <a :href="'#/@' + post.author">
          <img
            :src="avatarUrl"
            style="width:40px;height:40px;border-radius:50%;border:2px solid #2e2050;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>
        <div>
          <a
            :href="'#/@' + post.author"
            style="font-weight:bold;color:#a855f7;text-decoration:none;font-size:14px;"
          >@{{ post.author }}</a>
          <div style="font-size:12px;color:#5a4e70;">
            <a
              :href="twistUrl"
              :title="absoluteTime"
              style="color:#5a4e70;text-decoration:none;"
            >{{ relativeTime }}</a>
          </div>
        </div>
      </div>

      <!-- Body -->
      <live-twist-component
        v-if="isLiveTwist"
        :post="post"
        style="margin-bottom:12px;"
      ></live-twist-component>
      <div
        v-else
        class="twist-body"
        v-html="isLong && !threadExpanded ? bodyPreviewHtml : bodyHtml"
        style="margin-bottom:12px;"
      ></div>

      <!-- Expand / Collapse thread button (long posts only) -->
      <div v-if="isLong" style="margin-bottom:12px;">
        <button
          @click="threadExpanded = !threadExpanded"
          style="
            background:none;border:none;padding:0;
            color:#a855f7;font-size:13px;font-weight:600;
            cursor:pointer;text-decoration:underline;
          "
        >
          {{ threadExpanded ? "▲ Collapse thread" : "▼ Expand thread" }}
        </button>
      </div>

      <!-- Footer actions -->
      <div style="display:flex;align-items:center;gap:12px;font-size:13px;margin-top:12px;flex-wrap:wrap;">

        <!-- Love -->
        <button
          @click="vote"
          :disabled="!canAct || isVoting || hasVoted"
          :style="{
            background: hasVoted ? '#3b0764' : '#1e1535',
            color:      hasVoted ? '#e879f9' : '#9b8db0',
            border:     hasVoted ? '1px solid #a855f7' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 12px',
            cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
            fontSize:'13px', margin:0
          }"
        >{{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}</button>

        <!-- Retwist -->
        <button
          @click="retwist"
          :disabled="!canAct || isRetwisting || hasRetwisted || post.author === username"
          :style="{
            background: hasRetwisted ? '#0c2d1a' : '#1e1535',
            color:      hasRetwisted ? '#4ade80' : '#9b8db0',
            border:     hasRetwisted ? '1px solid #166534' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 12px',
            cursor: (!canAct || hasRetwisted || post.author === username) ? 'default' : 'pointer',
            fontSize:'13px', margin:0
          }"
          :title="post.author === username ? 'Cannot retwist your own twist' : ''"
        >{{ isRetwisting ? "…" : (hasRetwisted ? "🔁 Retwisted" : "🔁") }}</button>

        <!-- Replies -->
        <button
          @click="toggleReplies"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 12px;font-size:13px;margin:0;"
        >💬 {{ replyCount }}</button>

        <!-- Permalink -->
        <a
          :href="twistUrl"
          style="margin-left:auto;font-size:12px;color:#2e2050;text-decoration:none;"
          title="Open twist page"
        >🔗</a>

        <!-- Pin / Unpin — own posts only -->
        <button
          v-if="isOwnPost && hasKeychain"
          @click="pinned ? unpinPost() : pinPost()"
          :disabled="isPinning"
          :style="{
            background: pinned ? '#1a2a0a' : '#1e1535',
            color:      pinned ? '#86efac' : '#9b8db0',
            border:     pinned ? '1px solid #166534' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 10px',
            fontSize:'12px', margin:0,
            cursor: isPinning ? 'default' : 'pointer'
          }"
          :title="pinned ? 'Unpin this twist' : 'Pin to top of your profile'"
        >{{ isPinning ? '…' : (pinned ? '📌 Pinned' : '📌') }}</button>

        <!-- Edit / Delete — own posts only -->
        <button
          v-if="isOwnPost && hasKeychain"
          @click="openEdit"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 10px;font-size:12px;margin:0;"
          title="Edit this twist"
        >✏️</button>

        <button
          v-if="isOwnPost && hasKeychain"
          @click="confirmDelete"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 10px;font-size:12px;margin:0;"
          title="Delete this twist"
        >🗑️</button>

      </div>

      <!-- Inline edit box — regular twist -->
      <div v-if="showEditBox" style="margin-top:12px;">
        <textarea
          v-model="editText"
          style="
            width:100%;box-sizing:border-box;padding:8px;border-radius:8px;
            border:1px solid #2e2050;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:80px;
          "
          @keydown.ctrl.enter="saveEdit"
        ></textarea>
        <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
          <button @click="showEditBox = false"
            style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                   border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
          >Cancel</button>
          <button @click="saveEdit" :disabled="!editText.trim() || isEditing"
            style="padding:4px 14px;font-size:12px;margin:0;"
          >{{ isEditing ? "Saving…" : "Save" }}</button>
        </div>
      </div>

      <!-- Inline edit box — Live Twist -->
      <div v-if="isLiveEditBox" style="margin-top:12px;background:#0a0616;border:1px solid #2e2050;border-radius:8px;padding:10px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="font-size:13px;">&#9889;</span>
          <span style="font-size:12px;font-weight:600;color:#fb923c;">Edit Live Twist</span>
        </div>
        <div style="margin-bottom:6px;">
          <label style="font-size:11px;color:#9b8db0;display:block;margin-bottom:2px;">Card label</label>
          <input v-model="editTitle" type="text" placeholder="Live Twist" maxlength="80"
            style="width:100%;box-sizing:border-box;padding:5px 8px;border-radius:6px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:13px;" />
        </div>
        <div style="margin-bottom:6px;">
          <label style="font-size:11px;color:#9b8db0;display:block;margin-bottom:2px;">Body <span style="color:#5a4e70;">(shown on Steemit)</span></label>
          <input v-model="editBody" type="text" placeholder="Live Twist — view on SteemTwist" maxlength="280"
            style="width:100%;box-sizing:border-box;padding:5px 8px;border-radius:6px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:13px;" />
        </div>
        <div style="margin-bottom:6px;">
          <label style="font-size:11px;color:#9b8db0;display:block;margin-bottom:2px;">Code</label>
          <textarea v-model="editCode" spellcheck="false"
            style="width:100%;box-sizing:border-box;padding:7px;border-radius:6px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:12px;font-family:monospace;resize:vertical;min-height:120px;line-height:1.5;"
            @keydown.ctrl.enter="saveLiveEdit"
          ></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:6px;">
          <button @click="isLiveEditBox = false"
            style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
          >Cancel</button>
          <button @click="saveLiveEdit" :disabled="!editCode.trim() || isEditing"
            style="padding:4px 14px;font-size:12px;margin:0;background:linear-gradient(135deg,#c2410c,#ea580c);"
          >{{ isEditing ? "Saving…" : "Save &#9889;" }}</button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-if="showDeleteConfirm" style="
        margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
      ">
        <div style="margin-bottom:8px;">Delete this twist? This cannot be undone.</div>
        <div style="display:flex;gap:6px;">
          <button
            @click="doDelete"
            :disabled="isDeleting"
            style="background:#7f1d1d;border:none;color:#fff;border-radius:20px;
                   padding:4px 14px;font-size:12px;margin:0;"
          >{{ isDeleting ? "Deleting…" : "Delete" }}</button>
          <button
            @click="showDeleteConfirm = false"
            style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                   border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
          >Cancel</button>
        </div>
      </div>

      <!-- Inline reply compose box -->
      <div v-if="showReplyBox && canAct" style="margin-top:12px;">
        <div style="display:flex;gap:4px;margin-bottom:4px;">
          <button
            @click="replyPreviewMode = false"
            :style="{
              background: !replyPreviewMode ? '#2e2050' : 'none',
              color:      !replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
              padding:'3px 10px', fontSize:'12px', margin:0, cursor:'pointer'
            }"
          >Write</button>
          <button
            @click="replyPreviewMode = true"
            :style="{
              background: replyPreviewMode ? '#2e2050' : 'none',
              color:      replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
              padding:'3px 10px', fontSize:'12px', margin:0, cursor:'pointer'
            }"
          >Preview</button>
        </div>
        <textarea
          v-show="!replyPreviewMode"
          v-model="replyText"
          placeholder="Write a reply… (markdown supported)"
          maxlength="1000"
          style="
            width:100%;box-sizing:border-box;
            padding:8px;border-radius:0 8px 8px 8px;
            border:1px solid #2e2050;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:60px;
          "
        ></textarea>
        <div
          v-show="replyPreviewMode"
          class="twist-body"
          v-html="replyPreviewHtml"
          style="
            min-height:60px;padding:8px;border-radius:0 8px 8px 8px;
            border:1px solid #2e2050;background:#0f0a1e;
            font-size:14px;color:#e8e0f0;line-height:1.6;word-break:break-word;
          "
        ></div>
        <div style="text-align:right;margin-top:4px;">
          <button
            @click="submitReply"
            :disabled="!replyText.trim() || isReplying"
            style="font-size:13px;padding:5px 14px;"
          >{{ isReplying ? "Posting…" : "Reply" }}</button>
        </div>
      </div>

      <!-- Blockchain error -->
      <div v-if="lastError" style="
        margin-top:10px;padding:8px 10px;border-radius:8px;font-size:13px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        display:flex;justify-content:space-between;align-items:center;gap:8px;
      ">
        <span>⚠️ {{ lastError }}</span>
        <button
          @click="lastError = ''"
          style="background:none;border:none;cursor:pointer;font-size:15px;
                 padding:0;color:#fca5a5;line-height:1;margin:0;"
        >✕</button>
      </div>

      <!-- Thread replies — below actions so the action bar never moves -->
      <thread-component
        v-if="showThread"
        :author="post.author"
        :permlink="post.permlink"
      ></thread-component>

    </div>
  `
};

// ---- LiveTwistComposerComponent ----
// Specialised editor for composing Live Twists.
// Three-pane layout: Title + Code editor + live sandbox preview.
// The preview uses the same sandboxDoc builder as LiveTwistComponent
// so what you see in the editor is exactly what viewers will see.
const LiveTwistComposerComponent = {
  name: "LiveTwistComposerComponent",
  templates: LIVE_TWIST_TEMPLATES,   // static; accessed via $options.templates
  props: {
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    isPosting:   { type: Boolean, default: false }
  },
  emits: ["post", "cancel"],
  data() {
    const draft = draftStorage.load("live_composer", {});
    return {
      title:        draft.title || "",
      body:         draft.body  || "",
      code:         draft.code  || "",
      activeTab:   "code",  // "code" | "preview" | "templates"
      previewKey:  0,
      iframeHeight: 200
    };
  },
  computed: {
    codeBytes() { return new TextEncoder().encode(this.code).length; },
    tooBig()    { return this.codeBytes > 10240; },
    sizeLabel() { return (this.codeBytes / 1024).toFixed(1) + " / 10 KB"; },
    canPost() {
      return !!this.username && this.hasKeychain &&
             this.code.trim().length > 0 && !this.tooBig && !this.isPosting;
    }
  },
  watch: {
    title(v) { draftStorage.save("live_composer", { title: v, body: this.body, code: this.code }); },
    body(v)  { draftStorage.save("live_composer", { title: this.title, body: v, code: this.code }); },
    code(v)  { draftStorage.save("live_composer", { title: this.title, body: this.body, code: v }); }
  },
  methods: {
    buildSandboxDoc(userCode) {
      const escaped = JSON.stringify(userCode);
      return "<!DOCTYPE html><html><head><meta charset='utf-8'><style>" +
        "body{margin:0;padding:8px;font-family:system-ui,sans-serif;font-size:14px;" +
        "background:#0f0a1e;color:#e8e0f0;box-sizing:border-box;word-break:break-word}" +
        "*{box-sizing:border-box}" +
        "button{cursor:pointer;padding:5px 12px;border-radius:6px;background:#6d28d9;" +
        "color:#fff;border:none;font-size:13px}" +
        "input,textarea{background:#1a1030;color:#e8e0f0;border:1px solid #3b1f5e;" +
        "border-radius:6px;padding:5px 8px;font-size:13px;width:100%}" +
        "#_log{margin-top:8px;padding:6px;background:#0a0616;border-radius:6px;" +
        "font-family:monospace;font-size:12px;color:#9b8db0;max-height:80px;" +
        "overflow-y:auto;border:1px solid #2e1060;display:none}" +
        "</style></head><body>" +
        "<div id='_root'></div><div id='_log'></div>" +
        "<script>(function(){" +
        "window.fetch=()=>Promise.reject(new Error('Network blocked'));" +
        "window.XMLHttpRequest=function(){throw new Error('Network blocked');};" +
        "window.WebSocket=function(){throw new Error('Network blocked');};" +
        "window.open=()=>null;" +
        "var purify=null;" +
        "function sanitize(h){if(typeof h!=='string')return '';if(purify)return purify.sanitize(h,{FORBID_TAGS:['script','iframe','object','embed'],FORBID_ATTR:['onclick','onerror','onload','onmouseover','onfocus'],ALLOW_DATA_ATTR:false,FORCE_BODY:true});return h.replace(/<script[\\s\\S]*?<\\/script>/gi,'');}" +
        "var _log=document.getElementById('_log');" +
        "var _root=document.getElementById('_root');" +
        "var app={" +
        "render:function(h){_root.innerHTML=sanitize(String(h));}," +
        "text:function(s){_root.textContent=String(s).slice(0,2000);}," +
        "resize:function(h){var px=Math.min(Math.max(parseInt(h)||200,40),600);parent.postMessage({type:'resize',height:px},'*');}," +
        "log:function(){var a=Array.prototype.slice.call(arguments);_log.style.display='block';var l=document.createElement('div');l.textContent=a.map(function(x){return typeof x==='object'?JSON.stringify(x):String(x);}).join(' ');_log.appendChild(l);_log.scrollTop=_log.scrollHeight;}" +
        "};" +
        "var userCode=" + escaped + ";" +
        "try{var fn=new Function('app',userCode);var r=fn(app);if(r&&typeof r.catch==='function')r.catch(function(e){_root.innerHTML='<em style=\"color:#fca5a5\">Error: '+String(e)+'</em>';});parent.postMessage({type:'running'},'*');}catch(e){_root.innerHTML='<em style=\"color:#fca5a5\">Error: '+String(e)+'</em>';}" +
        "setTimeout(function(){var h=document.body.scrollHeight;if(h>40)parent.postMessage({type:'resize',height:h+16},'*');},150);" +
        "})();<\/script></body></html>";
    },
    runPreview() {
      this.activeTab = "preview";
      this.previewKey++;
    },
    onMessage(e) {
      if (e.origin !== "null") return;
      if (e.data && e.data.type === "resize") {
        this.iframeHeight = Math.min(e.data.height || 200, 480);
      }
    },
    submit() {
      if (!this.canPost) return;
      this.$emit("post", {
        title: this.title.trim() || "Live Twist",
        body:  this.body.trim()  || "Live Twist — view on SteemTwist",
        code:  this.code.trim()
      });
      // Draft cleared by parent (HomeView/ExploreView) on confirmed success
    },
    clearDraft() {
      draftStorage.clear("live_composer");
      this.title = ""; this.body = ""; this.code = "";
      this.activeTab = "code"; this.previewKey++;
    },
    useTemplate(tpl) {
      this.code      = tpl.code;
      this.title     = this.title || tpl.name;
      this.activeTab = "code";
    }
  },
  mounted()   { window.addEventListener("message", this.onMessage); },
  unmounted() { window.removeEventListener("message", this.onMessage); },
  template: `
    <div style="background:#1e1535;border:1px solid #2e2050;border-radius:0 8px 8px 8px;padding:16px;text-align:left;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:16px;">&#9889;</span>
          <span style="color:#fb923c;font-weight:700;font-size:14px;">Live Twist Editor</span>
        </div>
        <button @click="$emit('cancel')"
          style="background:none;border:none;color:#5a4e70;font-size:18px;padding:0;margin:0;cursor:pointer;line-height:1;">&#10005;</button>
      </div>

      <!-- Card label (stored in json_metadata.title, shown in the ⚡ card header) -->
      <div style="margin-bottom:8px;">
        <label style="font-size:12px;color:#9b8db0;display:block;margin-bottom:3px;">
          Card label <span style="color:#5a4e70;">(optional — shown next to &#9889; in the card)</span>
        </label>
        <input v-model="title" type="text" placeholder="Live Twist" maxlength="80"
          style="width:100%;box-sizing:border-box;padding:6px 10px;border-radius:8px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:14px;" />
      </div>

      <!-- Body — shown on Steemit and other non-SteemTwist clients (max 280 chars) -->
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;color:#9b8db0;display:block;margin-bottom:3px;">
          Body <span style="color:#5a4e70;">(shown on Steemit — max 280 chars, like a regular twist)</span>
        </label>
        <input v-model="body" type="text" placeholder="&#9889; Live Twist — view on SteemTwist" maxlength="280"
          style="width:100%;box-sizing:border-box;padding:6px 10px;border-radius:8px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:14px;" />
      </div>

      <!-- Code / Preview / Templates tabs -->
      <div style="display:flex;gap:4px;margin-bottom:0;">
        <button @click="activeTab = 'code'"
          :style="{ background: activeTab==='code' ? '#2e2050' : 'none', color: activeTab==='code' ? '#e8e0f0' : '#9b8db0', border:'1px solid #2e2050', borderRadius:'6px 6px 0 0', padding:'4px 14px', fontSize:'12px', margin:0, cursor:'pointer' }">Code</button>
        <button @click="runPreview"
          :style="{ background: activeTab==='preview' ? '#2e2050' : 'none', color: activeTab==='preview' ? '#fb923c' : '#9b8db0', border:'1px solid #2e2050', borderRadius:'6px 6px 0 0', padding:'4px 14px', fontSize:'12px', margin:0, cursor:'pointer' }">&#9654; Preview</button>
        <button @click="activeTab = 'templates'"
          :style="{ background: activeTab==='templates' ? '#2e2050' : 'none', color: activeTab==='templates' ? '#22d3ee' : '#9b8db0', border:'1px solid #2e2050', borderRadius:'6px 6px 0 0', padding:'4px 14px', fontSize:'12px', margin:0, cursor:'pointer' }">&#128196; Templates</button>
      </div>

      <!-- Code editor -->
      <textarea v-show="activeTab === 'code'" v-model="code"
        placeholder="// app.render(html) — render HTML&#10;// app.text(str)  — render plain text&#10;// app.resize(px) — resize iframe&#10;// app.log(...)   — console output&#10;&#10;// Example: click counter&#10;// let n=0;&#10;// function draw(){&#10;//   app.render('&lt;button id=b&gt;Clicks: '+n+'&lt;/button&gt;');&#10;//   document.getElementById('b').onclick=()=>{n++;draw();}&#10;// }&#10;// draw();"
        spellcheck="false"
        style="width:100%;box-sizing:border-box;padding:10px;border-radius:0 8px 8px 8px;border:1px solid #2e2050;background:#0a0616;color:#e8e0f0;font-size:13px;font-family:monospace;resize:vertical;min-height:160px;line-height:1.5;"></textarea>

      <!-- Preview iframe -->
      <div v-if="activeTab === 'preview'" style="border-radius:0 8px 8px 8px;border:1px solid #2e2050;overflow:hidden;">
        <iframe :key="previewKey" sandbox="allow-scripts"
          :srcdoc="buildSandboxDoc(code)"
          :style="{ width:'100%', border:'none', display:'block', height: iframeHeight + 'px', background:'#0f0a1e' }"
          scrolling="no"></iframe>
      </div>

      <!-- Templates grid -->
      <div v-if="activeTab === 'templates'"
        style="border:1px solid #2e2050;border-radius:0 8px 8px 8px;background:#0a0616;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div
          v-for="tpl in $options.templates"
          :key="tpl.id"
          @click="useTemplate(tpl)"
          style="background:#1a1030;border:1px solid #2e2050;border-radius:8px;padding:10px;cursor:pointer;transition:border-color 0.15s;"
          @mouseenter="$event.currentTarget.style.borderColor='#a855f7'"
          @mouseleave="$event.currentTarget.style.borderColor='#2e2050'"
        >
          <div style="font-size:18px;margin-bottom:4px;">{{ tpl.icon }}</div>
          <div style="font-size:13px;font-weight:600;color:#e8e0f0;margin-bottom:2px;">{{ tpl.name }}</div>
          <div style="font-size:11px;color:#9b8db0;line-height:1.4;">{{ tpl.desc }}</div>
          <div style="margin-top:6px;font-size:11px;color:#22d3ee;">Use template &#8594;</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:6px;">
        <span :style="{ fontSize:'12px', color: tooBig ? '#fca5a5' : '#5a4e70' }">{{ sizeLabel }}{{ tooBig ? ' — exceeds 10 KB limit' : '' }}</span>
        <div style="display:flex;gap:6px;">
          <button v-if="activeTab !== 'preview' && activeTab !== 'templates'" @click="runPreview" :disabled="!code.trim()"
            style="background:#1e1535;border:1px solid #f97316;color:#fb923c;border-radius:20px;padding:5px 14px;font-size:12px;margin:0;">&#9654; Preview</button>
          <button @click="submit" :disabled="!canPost"
            style="padding:6px 20px;margin:0;font-size:13px;">{{ isPosting ? "Publishing..." : "Publish &#9889;" }}</button>
        </div>
      </div>

      <!-- Security notice -->
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;font-size:11px;color:#5a4e70;background:#0a0616;border:1px solid #1a0a30;line-height:1.5;">
        &#128274; Runs in isolated sandbox — no network, no wallet, no page access. Code stored publicly on Steem.
      </div>
    </div>
  `
};


const TwistComposerComponent = {
  name: "TwistComposerComponent",
  components: { LiveTwistComposerComponent },
  props: {
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    isPosting:   { type: Boolean, default: false }
  },
  emits: ["post", "post-live"],
  data() {
    const draft = draftStorage.load("twist_composer", {});
    return {
      composerMode: draft.composerMode || "twist",
      message:      draft.message      || "",
      previewMode:  false
    };
  },
  computed: {
    charCount()   { return this.message.length; },
    overLimit()   { return this.charCount > 280; },
    canPost()     { return !!this.username && this.hasKeychain && this.charCount > 0 && !this.overLimit && !this.isPosting; },
    previewHtml() {
      return this.message.trim()
        ? DOMPurify.sanitize(renderMarkdown(this.message))
        : "<em style='color:#5a4e70'>Nothing to preview.</em>";
    }
  },
  watch: {
    message(v)      { draftStorage.save("twist_composer", { composerMode: this.composerMode, message: v }); },
    composerMode(v) { draftStorage.save("twist_composer", { composerMode: v, message: this.message }); }
  },
  methods: {
    submit() {
      if (!this.canPost) return;
      this.$emit("post", this.message.trim());
      this.message     = "";
      this.previewMode = false;
      draftStorage.clear("twist_composer");
    },
    submitLive({ title, body, code }) {
      this.$emit("post-live", { title, body, code });
      // LiveTwistComposerComponent clears its own draft on emit
    }
  },
  template: `
    <div style="margin:0 auto 20px;max-width:600px;">

      <!-- Mode selector: Twist | Live Twist -->
      <div style="display:flex;gap:4px;margin-bottom:-1px;position:relative;z-index:1;">
        <button
          @click="composerMode = 'twist'"
          :style="{
            background: composerMode === 'twist' ? '#1e1535' : '#0f0a1e',
            color:      composerMode === 'twist' ? '#e8e0f0' : '#5a4e70',
            border:'1px solid #2e2050',
            borderBottom: composerMode === 'twist' ? '1px solid #1e1535' : '1px solid #2e2050',
            borderRadius:'8px 8px 0 0',
            padding:'5px 16px', fontSize:'13px', fontWeight:'600', margin:0, cursor:'pointer'
          }"
        >🌀 Twist</button>
        <button
          @click="composerMode = 'live'"
          :style="{
            background: composerMode === 'live' ? '#1e1535' : '#0f0a1e',
            color:      composerMode === 'live' ? '#fb923c' : '#5a4e70',
            border:'1px solid #2e2050',
            borderBottom: composerMode === 'live' ? '1px solid #1e1535' : '1px solid #2e2050',
            borderRadius:'8px 8px 0 0',
            padding:'5px 16px', fontSize:'13px', fontWeight:'600', margin:0, cursor:'pointer'
          }"
        >⚡ Live Twist</button>
      </div>

      <!-- Regular Twist composer -->
      <div
        v-show="composerMode === 'twist'"
        style="
          background:#1e1535;border:1px solid #2e2050;border-radius:0 8px 8px 8px;
          padding:16px;text-align:left;
        "
      >
        <div style="display:flex;gap:4px;margin-bottom:6px;">
          <button
            @click="previewMode = false"
            :style="{
              background: !previewMode ? '#2e2050' : 'none',
              color:      !previewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
              padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
            }"
          >Write</button>
          <button
            @click="previewMode = true"
            :style="{
              background: previewMode ? '#2e2050' : 'none',
              color:      previewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #2e2050', borderRadius:'6px 6px 0 0',
              padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
            }"
          >Preview</button>
        </div>

        <textarea
          v-show="!previewMode"
          v-model="message"
          placeholder="What's your twist? (markdown supported)"
          maxlength="500"
          style="
            width:100%;box-sizing:border-box;
            padding:10px;border-radius:0 8px 8px 8px;
            border:1px solid #2e2050;background:#0f0a1e;
            color:#e8e0f0;font-size:15px;
            resize:none;height:80px;
          "
          @keydown.ctrl.enter="submit"
        ></textarea>

        <div
          v-show="previewMode"
          class="twist-body"
          v-html="previewHtml"
          style="
            min-height:80px;padding:10px;border-radius:0 8px 8px 8px;
            border:1px solid #2e2050;background:#0f0a1e;
            font-size:15px;color:#e8e0f0;line-height:1.6;word-break:break-word;
          "
        ></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span :style="{ fontSize:'13px', color: overLimit ? '#fca5a5' : '#5a4e70' }">
            {{ charCount }} / 280
          </span>
          <button @click="submit" :disabled="!canPost" style="padding:7px 20px;margin:0;">
            {{ isPosting ? "Posting..." : "Twist 🌀" }}
          </button>
        </div>
      </div>

      <!-- Live Twist editor — v-if so it only mounts when the tab is active -->
      <live-twist-composer-component
        v-if="composerMode === 'live'"
        :username="username"
        :has-keychain="hasKeychain"
        :is-posting="isPosting"
        @post="submitLive"
        @cancel="composerMode = 'twist'"
        style="margin:0;"
      ></live-twist-composer-component>

    </div>
  `
};


const SignalItemComponent = {
  name: "SignalItemComponent",
  props: {
    signal: { type: Object, required: true },
    read:   { type: Boolean, default: false }
  },
  computed: {
    icon() {
      return { love: "❤️", reply: "💬", mention: "📣", follow: "👤", retwist: "🔁", secret_twist: "🔒" }[this.signal.type] || "🔔";
    },
    label() {
      const a = `@${this.signal.actor}`;
      switch (this.signal.type) {
        case "love":    return `${a} gave twist love to your twist`;
        case "reply":   return `${a} replied to your twist`;
        case "mention": return `${a} mentioned you`;
        case "follow":  return `${a} followed you`;
        case "retwist":       return `${a} retwisted your twist`;
        case "secret_twist":  return `${a} sent you a Secret Twist`;
        default:              return `${a} interacted with you`;
      }
    },
    // Build a link to the relevant twist page for every signal type that
    // has a target post. postAuthor + permlink are now stored on all types.
    viewUrl() {
      if (!this.signal.postAuthor || !this.signal.permlink) return null;
      return `#/@${this.signal.postAuthor}/${this.signal.permlink}`;
    },
    relativeTime() {
      const diff = Date.now() - this.signal.ts.getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    absoluteTime() {
      return this.signal.ts.toUTCString().replace(" GMT", " UTC");
    }
  },
  template: `
    <div :style="{
      display:'flex', alignItems:'flex-start', gap:'12px',
      padding:'12px 14px',
      background: read ? 'var(--card, #1e1535)' : '#1a1040',
      borderBottom:'1px solid #2e2050',
      borderLeft: read ? '3px solid transparent' : '3px solid #a855f7',
      transition:'background 0.2s'
    }">

      <!-- Actor avatar -->
      <a :href="'#/@' + signal.actor" style="flex-shrink:0;">
        <img
          :src="'https://steemitimages.com/u/' + signal.actor + '/avatar/small'"
          style="width:36px;height:36px;border-radius:50%;border:2px solid #2e2050;"
          @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
        />
      </a>

      <!-- Content -->
      <div style="flex:1;min-width:0;">

        <!-- Type icon + label -->
        <div style="font-size:14px;color:#e8e0f0;line-height:1.4;">
          <span style="margin-right:5px;">{{ icon }}</span>
          <a
            :href="'#/@' + signal.actor"
            style="color:#a855f7;font-weight:600;text-decoration:none;"
          >@{{ signal.actor }}</a>
          <span style="color:#9b8db0;">
            {{ label.replace('@' + signal.actor, '').trim() }}
          </span>
        </div>

        <!-- Body preview -->
        <div v-if="signal.body" style="
          margin-top:4px;font-size:13px;color:#9b8db0;
          font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        ">
          "{{ signal.body }}"
        </div>

        <!-- Timestamp + link -->
        <div style="display:flex;align-items:center;gap:10px;margin-top:5px;">
          <span :title="absoluteTime" style="font-size:12px;color:#5a4e70;">
            {{ relativeTime }}
          </span>
          <a
            v-if="viewUrl"
            :href="viewUrl"
            style="font-size:12px;color:#22d3ee;text-decoration:none;"
          >View →</a>
        </div>

      </div>

      <!-- Unread dot -->
      <div v-if="!read" style="
        width:8px;height:8px;border-radius:50%;
        background:#a855f7;flex-shrink:0;margin-top:4px;
      "></div>

    </div>
  `
};

// ---- UserRowComponent ----
// A compact user row: avatar, display name, @username, bio, optional Follow button.
// Used in Followers, Following, and Friends lists.
const UserRowComponent = {
  name: "UserRowComponent",
  props: {
    username:     { type: String,  required: true },
    profileData:  { type: Object,  default: null },
    // Follow feature — only shown when loggedInUser is set and not viewing own row
    loggedInUser: { type: String,  default: "" },
    hasKeychain:  { type: Boolean, default: false },
    isFollowing:  { type: Boolean, default: false }  // is loggedInUser following this user?
  },
  emits: ["follow", "unfollow"],
  data() {
    return {
      followState:  this.isFollowing,   // local optimistic state
      isBusy:       false
    };
  },
  watch: {
    isFollowing(v) { this.followState = v; }
  },
  computed: {
    displayName() { return this.profileData?.displayName || this.username; },
    about()       { return this.profileData?.about || ""; },
    profileUrl()  { return `#/@${this.username}`; },
    showFollowBtn() {
      // Show only when logged in, has Keychain, and not viewing your own row
      return !!this.loggedInUser && this.hasKeychain &&
             this.loggedInUser !== this.username;
    }
  },
  methods: {
    toggleFollow(e) {
      e.preventDefault();   // don't navigate via the parent <a>
      e.stopPropagation();
      if (this.isBusy) return;
      this.isBusy = true;
      const action = this.followState ? unfollowUser : followUser;
      action(this.loggedInUser, this.username, (res) => {
        this.isBusy = false;
        if (res.success) {
          this.followState = !this.followState;
          this.$emit(this.followState ? "follow" : "unfollow", this.username);
        }
      });
    }
  },
  template: `
    <a
      :href="profileUrl"
      style="
        display:flex;align-items:center;gap:12px;
        padding:10px 14px;
        text-decoration:none;
        border-bottom:1px solid #2e2050;
        transition:background 0.15s;
      "
      @mouseenter="$event.currentTarget.style.background='#16102a'"
      @mouseleave="$event.currentTarget.style.background=''"
    >
      <!-- Avatar -->
      <img
        :src="'https://steemitimages.com/u/' + username + '/avatar/small'"
        style="width:40px;height:40px;border-radius:50%;border:2px solid #2e2050;flex-shrink:0;"
        @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
      />

      <!-- Name + username + bio -->
      <div style="min-width:0;flex:1;">
        <div style="font-weight:600;color:#e8e0f0;font-size:14px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          {{ displayName }}
        </div>
        <div style="font-size:12px;color:#a855f7;">@{{ username }}</div>
        <div v-if="about" style="
          font-size:12px;color:#9b8db0;margin-top:2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        ">{{ about }}</div>
      </div>

      <!-- Follow / Unfollow button -->
      <button
        v-if="showFollowBtn"
        @click="toggleFollow"
        :disabled="isBusy"
        :style="{
          flexShrink: 0,
          borderRadius: '20px', padding: '4px 12px', fontSize: '12px',
          fontWeight: '600', border: '1px solid', margin: 0,
          background:  followState ? '#0c2d1a' : 'linear-gradient(135deg,#8b2fc9,#e0187a)',
          color:       followState ? '#4ade80' : '#fff',
          borderColor: followState ? '#166534' : 'transparent',
          cursor:      isBusy ? 'default' : 'pointer'
        }"
      >{{ isBusy ? '…' : (followState ? 'Following' : 'Follow') }}</button>

      <!-- Arrow (when no follow button) -->
      <span v-else style="color:#2e2050;font-size:16px;flex-shrink:0;">›</span>
    </a>
  `
};

// ---- SecretTwistComposerComponent ----
// Composer for sending a Secret Twist to a specific recipient.
// Supports markdown with a Write / Preview tab toggle.
const SecretTwistComposerComponent = {
  name: "SecretTwistComposerComponent",
  props: {
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    isSending:   { type: Boolean, default: false },
    toUsername:  { type: String,  default: "" }
  },
  emits: ["send"],
  data() {
    const draft = draftStorage.load("secret_composer", {});
    return {
      recipient:   this.toUsername || draft.recipient || "",
      message:     draft.message   || "",
      previewMode: false
    };
  },
  computed: {
    charCount()   { return this.message.length; },
    previewHtml() {
      return this.message.trim()
        ? DOMPurify.sanitize(renderMarkdown(this.message))
        : "<em style='color:#5a4e70'>Nothing to preview.</em>";
    },
    canSend() {
      return !!this.username && this.hasKeychain &&
             !!this.recipient.trim() &&
             this.recipient.trim().replace(/^@/, "") !== this.username &&
             this.charCount > 0 && !this.isSending;
    }
  },
  watch: {
    recipient(v) { draftStorage.save("secret_composer", { recipient: v, message: this.message }); },
    message(v)   { draftStorage.save("secret_composer", { recipient: this.recipient, message: v }); }
  },
  methods: {
    submit() {
      if (!this.canSend) return;
      this.$emit("send", {
        recipient: this.recipient.trim().replace(/^@/, ""),
        message:   this.message.trim()
      });
      this.message     = "";
      this.previewMode = false;
      draftStorage.clear("secret_composer");
    }
  },
  template: `
    <div style="
      background:#1a1030;border:1px solid #3b1f5e;border-radius:12px;
      padding:16px;margin:0 auto 20px;max-width:600px;text-align:left;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:16px;">🔒</span>
        <span style="color:#c084fc;font-weight:600;font-size:14px;">New Secret Twist</span>
      </div>

      <!-- Recipient field -->
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;color:#9b8db0;display:block;margin-bottom:4px;">To</label>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#a855f7;font-size:15px;">@</span>
          <input
            v-model="recipient"
            type="text"
            placeholder="username"
            autocomplete="off"
            style="
              flex:1;padding:7px 10px;border-radius:8px;
              border:1px solid #3b1f5e;background:#0f0a1e;
              color:#e8e0f0;font-size:14px;
            "
            @keydown.enter="submit"
          />
        </div>
        <div v-if="recipient && recipient.trim() === username"
             style="font-size:12px;color:#fca5a5;margin-top:4px;">
          You cannot send a Secret Twist to yourself.
        </div>
      </div>

      <!-- Write / Preview tabs -->
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button
          @click="previewMode = false"
          :style="{
            background: !previewMode ? '#3b1f5e' : 'none',
            color:      !previewMode ? '#e8e0f0' : '#9b8db0',
            border: '1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
            padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
          }"
        >Write</button>
        <button
          @click="previewMode = true"
          :style="{
            background: previewMode ? '#3b1f5e' : 'none',
            color:      previewMode ? '#e8e0f0' : '#9b8db0',
            border: '1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
            padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
          }"
        >Preview</button>
      </div>

      <!-- Write mode -->
      <textarea
        v-show="!previewMode"
        v-model="message"
        placeholder="Write your secret message… (markdown supported)"
        style="
          width:100%;box-sizing:border-box;
          padding:10px;border-radius:0 8px 8px 8px;
          border:1px solid #3b1f5e;background:#0f0a1e;
          color:#e8e0f0;font-size:15px;
          resize:vertical;min-height:80px;
        "
        @keydown.ctrl.enter="submit"
      ></textarea>

      <!-- Preview mode -->
      <div
        v-show="previewMode"
        class="twist-body"
        v-html="previewHtml"
        style="
          min-height:80px;padding:10px;border-radius:0 8px 8px 8px;
          border:1px solid #3b1f5e;background:#0f0a1e;
          font-size:15px;color:#e8e0f0;line-height:1.6;word-break:break-word;
        "
      ></div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span style="font-size:13px;color:#5a4e70;">{{ charCount }} chars</span>
        <button
          @click="submit"
          :disabled="!canSend"
          style="padding:7px 20px;margin:0;background:linear-gradient(135deg,#6d28d9,#a21caf);"
        >{{ isSending ? "Sending…" : "Send 🔒" }}</button>
      </div>
    </div>
  `
};

// ---- SecretTwistCardComponent ----
// Renders a single Secret Twist. Shows a locked state to everyone except
// the sender and recipient, who see a Decrypt button. On successful
// decryption the plaintext is shown in place of the locked view.
const SecretTwistCardComponent = {
  name: "SecretTwistCardComponent",
  // Recursive: Vue resolves "secret-twist-card-component" from the global registry
  // by matching this component's name, enabling nested reply rendering.
  props: {
    post:        { type: Object,  required: true },
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    depth:       { type: Number,  default: 0 }    // nesting depth for replies
  },
  data() {
    return {
      decrypted:      null,    // plaintext after successful decrypt
      isDecrypting:   false,
      decryptError:   "",
      showReplyBox:    false,
      replyMessage:    draftStorage.load("secret_reply_" + this.post.permlink, ""),
      replyPreviewMode: false,
      isReplying:      false,
      replyError:      "",
      replies:        [],      // decrypted nested replies
      loadingReplies: false,
      repliesLoaded:  false
    };
  },
  computed: {
    meta() {
      try {
        const raw = this.post.json_metadata;
        if (!raw) return {};
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch { return {}; }
    },
    recipient()    { return this.meta.to || ""; },
    payload()      { return this.meta.payload || ""; },
    isSender()     { return this.username === this.post.author; },
    isRecipient()  { return this.username === this.recipient; },
    isParticipant(){ return this.isSender || this.isRecipient; },
    canDecrypt()   { return this.isParticipant && this.hasKeychain && !!this.payload; },
    // Can reply only if: participant, has Keychain, and did NOT author this post
    // (prevents replying to your own message in the thread)
    canReply()     { return this.isParticipant && this.hasKeychain && !this.isSender; },
    // The other party in the conversation — used for reply encryption
    otherParty()   { return this.isSender ? this.recipient : this.post.author; },
    avatarUrl()    { return `https://steemitimages.com/u/${this.post.author}/avatar/small`; },
    replyCount()      { return this.post.children || 0; },
    replyPreviewHtml() {
      return this.replyMessage.trim()
        ? DOMPurify.sanitize(renderMarkdown(this.replyMessage))
        : "<em style='color:#5a4e70'>Nothing to preview.</em>";
    },
    decryptedHtml() {
      if (this.decrypted === null) return "";
      return DOMPurify.sanitize(renderMarkdown(this.decrypted));
    },
    relativeTime() {
      const diff = Date.now() - steemDate(this.post.created).getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    }
  },
  watch: {
    replyMessage(v) { draftStorage.save("secret_reply_" + this.post.permlink, v); }
  },
    methods: {
    decrypt() {
      if (!this.canDecrypt || this.isDecrypting) return;
      this.isDecrypting = true;
      this.decryptError = "";
      decryptSecretTwist(this.username, this.otherParty, this.payload, (res) => {
        this.isDecrypting = false;
        if (res.success) {
          this.decrypted = (res.result || "").replace(/^#/, "");
          // Auto-load replies after decrypt if any exist
          if (this.replyCount > 0 && !this.repliesLoaded) this.loadReplies();
        } else {
          this.decryptError = res.error || res.message || "Decryption failed.";
        }
      });
    },

    // Load nested replies — returned as raw post objects so they can be
    // rendered recursively by SecretTwistCardComponent instances.
    async loadReplies() {
      if (this.loadingReplies || this.repliesLoaded) return;
      this.loadingReplies = true;
      try {
        const raw = await fetchReplies(this.post.author, this.post.permlink);
        // Keep only genuine secret_twist replies
        this.replies = raw.filter(r => {
          try {
            const m = r.json_metadata;
            const meta = m ? (typeof m === "string" ? JSON.parse(m) : m) : {};
            return meta.type === "secret_twist";
          } catch { return false; }
        });
        this.repliesLoaded = true;
      } catch {}
      this.loadingReplies = false;
    },

    sendReply() {
      const text = this.replyMessage.trim();
      if (!text || !this.isParticipant || !this.hasKeychain || this.isReplying) return;
      this.isReplying  = true;
      this.replyError  = "";
      replySecretTwist(
        this.username, this.otherParty, text,
        this.post.author, this.post.permlink,
        (res) => {
          this.isReplying = false;
          if (res.success) {
            this.replyMessage     = "";
            this.showReplyBox     = false;
            this.replyPreviewMode = false;
            draftStorage.clear("secret_reply_" + this.post.permlink);
            // Reload replies after a short delay for indexing
            setTimeout(() => {
              this.repliesLoaded = false;
              this.loadReplies();
            }, 3000);
          } else {
            this.replyError = res.error || res.message || "Reply failed.";
          }
        }
      );
    }
  },
  template: `
    <div style="
      background:#1a1030;border:1px solid #3b1f5e;border-radius:12px;
      padding:14px 16px;margin:10px auto;max-width:600px;text-align:left;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <a :href="'#/@' + post.author">
          <img
            :src="avatarUrl"
            style="width:40px;height:40px;border-radius:50%;border:2px solid #3b1f5e;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <a :href="'#/@' + post.author"
               style="font-weight:bold;color:#c084fc;text-decoration:none;font-size:14px;">
              @{{ post.author }}
            </a>
            <span style="font-size:13px;color:#9b8db0;">→</span>
            <a :href="'#/@' + recipient"
               style="font-weight:bold;color:#c084fc;text-decoration:none;font-size:14px;">
              @{{ recipient }}
            </a>
          </div>
          <div style="font-size:12px;color:#5a4e70;margin-top:2px;">{{ relativeTime }}</div>
        </div>
        <span style="font-size:20px;">🔒</span>
      </div>

      <!-- Body: decrypted or locked -->
      <div v-if="decrypted !== null"
        class="twist-body"
        v-html="decryptedHtml"
        style="
          background:#0f0a1e;border-radius:8px;padding:12px;
          font-size:15px;color:#e8e0f0;line-height:1.6;
          border:1px solid #3b1f5e;margin-bottom:10px;
          word-break:break-word;
        "
      ></div>

      <div v-else style="
        display:flex;align-items:center;gap:10px;
        background:#0f0a1e;border-radius:8px;padding:12px;
        border:1px solid #3b1f5e;margin-bottom:10px;
      ">
        <span style="font-size:22px;">🔒</span>
        <span v-if="canDecrypt" style="font-size:14px;color:#9b8db0;">
          {{ isSender ? 'You sent this Secret Twist.' : 'You received a Secret Twist.' }}
        </span>
        <span v-else style="font-size:14px;color:#5a4e70;font-style:italic;">
          Secret Twist — only visible to sender and recipient.
        </span>
      </div>

      <!-- Action bar — Decrypt + Reply (shown once decrypted) -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <!-- Decrypt button -->
        <button
          v-if="canDecrypt && decrypted === null"
          @click="decrypt"
          :disabled="isDecrypting"
          style="background:linear-gradient(135deg,#6d28d9,#a21caf);padding:6px 16px;font-size:13px;margin:0;"
        >{{ isDecrypting ? "Decrypting…" : "🔓 Decrypt" }}</button>

        <!-- Reply button — only after decrypt, only to non-authors -->
        <button
          v-if="decrypted !== null && canReply"
          @click="showReplyBox = !showReplyBox"
          style="background:#1a1030;border:1px solid #3b1f5e;color:#c084fc;
                 border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
        >💬 {{ replyCount > 0 ? replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') : 'Reply' }}</button>
      </div>

      <!-- Decrypt error -->
      <div v-if="decryptError" style="
        padding:8px 10px;border-radius:8px;font-size:13px;margin-bottom:8px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        display:flex;justify-content:space-between;align-items:center;
      ">
        <span>⚠️ {{ decryptError }}</span>
        <button @click="decryptError = ''"
          style="background:none;border:none;cursor:pointer;font-size:15px;padding:0;color:#fca5a5;line-height:1;margin:0;">✕</button>
      </div>

      <!-- Inline reply composer with Write / Preview -->
      <div v-if="showReplyBox && canReply" style="margin-bottom:10px;">
        <div style="display:flex;gap:4px;margin-bottom:4px;">
          <button
            @click="replyPreviewMode = false"
            :style="{
              background: !replyPreviewMode ? '#3b1f5e' : 'none',
              color:      !replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
              padding:'2px 10px', fontSize:'11px', margin:0, cursor:'pointer'
            }"
          >Write</button>
          <button
            @click="replyPreviewMode = true"
            :style="{
              background: replyPreviewMode ? '#3b1f5e' : 'none',
              color:      replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
              padding:'2px 10px', fontSize:'11px', margin:0, cursor:'pointer'
            }"
          >Preview</button>
        </div>

        <textarea
          v-show="!replyPreviewMode"
          v-model="replyMessage"
          placeholder="Write an encrypted reply… (markdown supported)"
          style="
            width:100%;box-sizing:border-box;padding:8px;
            border-radius:0 8px 8px 8px;
            border:1px solid #3b1f5e;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:60px;
          "
          @keydown.ctrl.enter="sendReply"
        ></textarea>

        <div
          v-show="replyPreviewMode"
          class="twist-body"
          v-html="replyPreviewHtml"
          style="
            min-height:60px;padding:8px;border-radius:0 8px 8px 8px;
            border:1px solid #3b1f5e;background:#0f0a1e;
            font-size:14px;color:#e8e0f0;line-height:1.6;word-break:break-word;
          "
        ></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:12px;color:#5a4e70;">{{ replyMessage.length }} chars</span>
          <button
            @click="sendReply"
            :disabled="!replyMessage.trim() || isReplying"
            style="background:linear-gradient(135deg,#6d28d9,#a21caf);padding:5px 14px;font-size:12px;margin:0;"
          >{{ isReplying ? "Sending…" : "Send 🔒" }}</button>
        </div>
        <div v-if="replyError" style="
          margin-top:6px;padding:6px 8px;border-radius:6px;font-size:12px;
          background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        ">⚠️ {{ replyError }}</div>
      </div>

      <!-- Nested encrypted replies — recursive SecretTwistCardComponent -->
      <div v-if="decrypted !== null && replies.length > 0" style="
        margin-top:8px;border-top:1px solid #2e1060;padding-top:8px;padding-left:12px;
      ">
        <secret-twist-card-component
          v-for="r in replies"
          :key="r.permlink"
          :post="r"
          :username="username"
          :has-keychain="hasKeychain"
          :depth="depth + 1"
          style="margin:0 0 8px 0;"
        ></secret-twist-card-component>
      </div>

      <!-- Loading replies indicator -->
      <div v-if="loadingReplies" style="font-size:12px;color:#5a4e70;padding:6px 0;">
        Loading replies…
      </div>
    </div>
  `
};
