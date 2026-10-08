import { put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

// Vercelの関数は本文が4.5MBまで。画像は4.3MBまでにそろえる（画面側で縮小して送る）
const MAX_IMAGE = 4 * 1024 * 1024 + 300 * 1024;

const META_KEYS = [
  'kouji', 'sekou', 'kojishu', 'sokuten', 'basho', 'heya', 'bikou',
  'date', 'dateLabel', 'originalName', 'color', 'imageUrl', 'imagePathname'
];

// 保存先の接続: 新しい方式は BLOB_STORE_ID（VercelのOIDC）、従来は BLOB_READ_WRITE_TOKEN
function hasBlobAuth() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}
function isReady() {
  return hasBlobAuth() && Boolean(process.env.SAVE_KEY);
}

function safeName(s, fallback) {
  const t = String(s || '')
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^[.\-]+/, '')
    .slice(0, 80);
  return t || fallback;
}

function sameKey(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

async function readBuffer(req) {
  if (Buffer.isBuffer(req.body)) return req.body.length > MAX_IMAGE ? null : req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_IMAGE) return null;
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

function monthFolder() {
  // 日本時間の年月（例: 2026-09）
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7);
}

// アプリ版（Capacitor）は別のオリジンから呼ぶので、そのオリジンだけ許可する
const APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = String(req.headers.origin || '');
  if (APP_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-save-key');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 画面が「保存先があるか」を調べるための確認用
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, ready: isReady() });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'メソッドが違います。' });
  }

  const need = process.env.SAVE_KEY;
  if (!need || !hasBlobAuth()) {
    return res.status(503).json({ error: 'サーバー側の設定（SAVE_KEY / Blob）が未完了です。' });
  }
  let given = '';
  try {
    given = decodeURIComponent(String(req.headers['x-save-key'] || ''));
  } catch (e) {
    given = '';
  }
  if (!sameKey(given, need)) {
    await new Promise((resolve) => setTimeout(resolve, 700)); // 総当たりを遅くする
    return res.status(401).json({ error: '保存用パスワードが違います。' });
  }

  const kind = String((req.query && req.query.kind) || '');
  const base = safeName(req.query && req.query.name, 'photo').replace(/\.(jpe?g|json)$/i, '');
  const folder = 'kokuban/' + monthFolder() + '/';

  try {
    if (kind === 'image') {
      const buf = await readBuffer(req);
      if (!buf) return res.status(413).json({ error: '画像が大きすぎます。' });
      if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
        return res.status(400).json({ error: 'JPEG画像ではありません。' });
      }
      const blob = await put(folder + base + '.jpg', buf, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: true
      });
      return res.status(200).json({ url: blob.url, pathname: blob.pathname });
    }

    if (kind === 'meta') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: '入力内容の形式が正しくありません。' });
      }
      const meta = { savedAt: new Date().toISOString() };
      for (const k of META_KEYS) {
        if (typeof body[k] === 'string') meta[k] = body[k].slice(0, 300);
      }
      const blob = await put(folder + base + '.json', JSON.stringify(meta, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: true
      });
      return res.status(200).json({ url: blob.url, pathname: blob.pathname });
    }

    return res.status(400).json({ error: 'kind は image か meta を指定してください。' });
  } catch (e) {
    console.error('save failed', e);
    return res.status(500).json({ error: '保存に失敗しました。時間をおいてもう一度お試しください。' });
  }
}
