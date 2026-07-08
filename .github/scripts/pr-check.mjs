// PR 자동검사 — 담당자가 PR을 열면 GitHub Actions가 이 스크립트를 실행한다.
//   (1) 시크릿(관리자 키) 커밋 차단   (2) HTML 내장 JS 문법검사   (3) 파일 구조검사
// 하나라도 실패하면 exit 1 → PR에 빨간불, 머지 전에 고쳐야 함.
import fs from 'fs';
import path from 'path';
import vm from 'vm';

let failed = false;
const err = (m) => { console.error('X ' + m); failed = true; };
const ok  = (m) => console.log('OK ' + m);

const exts = new Set(['.html', '.js', '.mjs', '.json', '.py', '.md', '.sh', '.txt', '.yml', '.yaml', '.css']);
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (exts.has(path.extname(name).toLowerCase())) out.push(p);
  }
  return out;
}
const files = walk('.');

// ── (1) 시크릿 스캔 ── 실제 키만 잡도록 패턴을 좁게(문서의 언급은 통과)
const secretRe = /sb_secret_[A-Za-z0-9]{16,}/;                                  // 신형 시크릿 키
const jwtRe = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;  // JWT 토큰
function jwtRole(tok) {
  try {
    const seg = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(Buffer.from(seg + '==', 'base64').toString('utf8')).role) || '';
  } catch { return ''; }
}
let secretHit = false;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (secretRe.test(t)) { err(`시크릿 키(sb_secret_) 발견: ${f} — 관리자 키는 커밋 금지`); secretHit = true; }
  for (const tok of (t.match(jwtRe) || [])) {
    if (jwtRole(tok) === 'service_role') { err(`service_role 키 발견: ${f} — 관리자 키는 커밋 금지`); secretHit = true; }
  }
}
if (!secretHit) ok('시크릿 스캔 통과 (service key 노출 없음)');

// ── (2) HTML 내장 JS 문법검사 ──
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let jsHit = false;
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  let m, i = 0;
  while ((m = scriptRe.exec(html))) {
    const attrs = m[1] || '', code = m[2] || ''; i++;
    if (/\bsrc\s*=/.test(attrs)) continue;                                                  // 외부 스크립트
    if (/type\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(attrs)) continue; // 비-JS(json/module 등)
    if (!code.trim()) continue;
    try { new vm.Script(code, { filename: `${f}#script${i}` }); }
    catch (e) { err(`JS 문법 오류: ${f} (script #${i}) — ${String(e.message).split('\n')[0]}`); jsHit = true; }
  }
}
if (!jsHit) ok('JS 문법검사 통과');

// ── (3) 구조검사 (파일 잘림 방지) ──
let stHit = false;
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const t = fs.readFileSync(f, 'utf8');
  const closes = (t.match(/<\/html>/gi) || []).length;
  if (closes !== 1) { err(`구조 오류: ${f} — </html> 태그가 ${closes}개(정확히 1개여야 함, 파일 잘림 의심)`); stHit = true; }
  if (Buffer.byteLength(t) < 1000) { err(`구조 오류: ${f} — 파일이 너무 작음(잘림 의심)`); stHit = true; }
}
if (!stHit) ok('구조검사 통과');

if (failed) { console.error('\n=== 검사 실패 — 위 문제를 고친 뒤 다시 푸시하세요. ==='); process.exit(1); }
console.log('\n=== 모든 검사 통과 ===');
