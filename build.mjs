// 빌드: src/ 의 HTML·CSS·JS 와 fonts/ 의 Galmuri 폰트를 한 파일로 합친다.
//   index.html          — 로컬에서 바로 열어 플레이 (완전한 문서)
//   dist/artifact.html  — 아티팩트 게시용 (doctype/html/head/body 없는 조각)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const JS = ['engine', 'sprites', 'world', 'worldmap', 'data', 'balance', 'ui', 'game', 'minigames', 'actions', 'events', 'main'];
const FONTS = [
  { family: 'Galmuri11', weight: 400, file: 'Galmuri11' },
  { family: 'Galmuri11', weight: 700, file: 'Galmuri11-Bold' },
  { family: 'Galmuri9', weight: 400, file: 'Galmuri9' },
];
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const fontCss = FONTS.map(f => {
  const sub = `fonts/${f.file}.subset.woff2`, full = `fonts/${f.file}.woff2`;
  const path = existsSync(new URL(sub, import.meta.url)) ? sub : full;
  const b64 = readFileSync(new URL(path, import.meta.url)).toString('base64');
  return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}).join('\n');
const license = '/* Galmuri fonts © 2019-2025 Lee Minseo (quiple), SIL Open Font License 1.1 — https://github.com/quiple/galmuri */';
const js = JS.map(n => `// ---- ${n}.js ----\n` + read(`src/js/${n}.js`)).join('\n');
const fragment = read('src/index.html')
  .replace('/*__FONTS__*/', () => license + '\n' + fontCss)
  .replace('/*__CSS__*/', () => read('src/style.css'))
  .replace('/*__JS__*/', () => js);
mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('dist/artifact.html', import.meta.url), fragment);
const full = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${fragment}\n</body>\n</html>\n`;
writeFileSync(new URL('index.html', import.meta.url), full);
console.log(`built index.html (${(full.length / 1024).toFixed(0)} KB) and dist/artifact.html`);
