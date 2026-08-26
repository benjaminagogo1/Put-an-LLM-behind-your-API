import fs from "node:fs/promises";
const cases = JSON.parse(await fs.readFile("evals/cases.json", "utf8"));
const base = process.env.EVAL_URL ?? "http://localhost:3000/triage";
let matched = 0; const failed = [];
for (const item of cases) {
  const res = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: item.text }) });
  const body = await res.json();
  const ok = body.category === item.expected.category && body.urgency === item.expected.urgency;
  if (ok) matched += 1; else failed.push(item.id);
}
console.log(JSON.stringify({ matched, total: cases.length, score: `${matched}/${cases.length}`, failed }));
