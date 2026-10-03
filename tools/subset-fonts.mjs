// Galmuri 폰트를 게임에 필요한 글자만 남겨 줄인다 (fonttools 의 pyftsubset 필요).
//   KS X 1001 한글 2,350자 + 한글 자모 + ASCII/Latin-1 + 소스 코드에 쓰인 모든 글자
// 사용법: node tools/subset-fonts.mjs [pyftsubset 경로]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const chars = new Set();
const add = s => { for (const ch of s) chars.add(ch); };
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));
for (let c = 0xa0; c <= 0xff; c++) chars.add(String.fromCharCode(c));
for (let c = 0x3131; c <= 0x318e; c++) chars.add(String.fromCharCode(c));
const td = new TextDecoder('euc-kr');
for (let a = 0xb0; a <= 0xc8; a++) for (let b = 0xa1; b <= 0xfe; b++) add(td.decode(Uint8Array.from([a, b])));
add('₩★☆▶◀▲▼●○■□·…“”‘’→←↑↓♥♪※✕');
for (const f of readdirSync(new URL('src/js/', root))) add(readFileSync(new URL('src/js/' + f, root), 'utf8'));
add(readFileSync(new URL('src/index.html', root), 'utf8'));
const text = [...chars].filter(ch => ch.codePointAt(0) >= 0x20).join('');
const tmp = new URL('fonts/.chars.txt', root);
writeFileSync(tmp, text);
const bin = process.argv[2] || 'pyftsubset';
for (const name of ['Galmuri11', 'Galmuri11-Bold', 'Galmuri9']) {
  execFileSync(bin, [new URL(`fonts/${name}.woff2`, root).pathname, `--text-file=${tmp.pathname}`, '--flavor=woff2', '--layout-features=*', `--output-file=${new URL(`fonts/${name}.subset.woff2`, root).pathname}`], { stdio: 'inherit' });
}
console.log(`subset ${chars.size} chars`);
