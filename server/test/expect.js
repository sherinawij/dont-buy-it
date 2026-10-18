// Tiny assertion helper for run.sh: reads "<json>\n<http status>" from stdin,
// evaluates a JS expression against { status, body }, and prints PASS/FAIL.
const [label, expression] = process.argv.slice(2);
let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  const lines = input.trimEnd().split('\n');
  const status = Number(lines.pop());
  let body = null;
  try { body = JSON.parse(lines.join('\n')); } catch { body = lines.join('\n'); }
  let ok = false;
  try { ok = Boolean(eval(expression)); } catch {}
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (HTTP ${status})`);
  console.log('      ' + JSON.stringify(body).slice(0, 400));
  if (!ok) process.exitCode = 1;
});
