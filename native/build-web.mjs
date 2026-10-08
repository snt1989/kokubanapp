// アプリに入れる画面（www）を、リポジトリ直下の index.html などから作る。
// 「サーバーに保存」を使う場合は、環境変数 APP_URL にVercelのURL（例: https://xxx.vercel.app）を入れる。
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.ico', 'favicon-32.png']) {
  cpSync(join(root, f), join(out, f));
}

let html = readFileSync(join(root, 'index.html'), 'utf8');
const base = (process.env.APP_URL || '').replace(/\/+$/, '');
if (base) {
  if (!/^https:\/\/[^\s"'<>]+$/.test(base)) throw new Error('APP_URL は https:// で始まるURLにしてください');
  html = html.replace('<head>', '<head>\n<script>window.KOKUBAN_API_BASE=' + JSON.stringify(base) + ';</script>');
  console.log('保存先API:', base + '/api/save');
} else {
  console.log('APP_URL が未設定のため、アプリ版では「サーバーに保存」は出ません。');
}
writeFileSync(join(out, 'index.html'), html);
console.log('native/www を作りました。');
