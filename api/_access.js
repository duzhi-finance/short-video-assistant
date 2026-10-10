// 密碼驗證、每日次數、密碼管理（檔名以底線開頭，Vercel 不會把它當成網址）
//
// Vercel 環境變數：
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//                  在 Vercel 專案 Storage 加上 Upstash Redis 會自動帶入
//                  （也接受 KV_REST_API_URL / KV_REST_API_TOKEN）。
//                  用來存放後台產生的密碼與每日次數。
//   ADMIN_PASSWORD 管理後台 /admin 的登入密碼
//   DAILY_LIMIT    選填。每組密碼每天可生成次數，預設 20
//   ACCESS_CODES   選填。固定密碼清單（逗號分隔），不需要後台也能用，適合自己測試

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const DAILY_LIMIT = Number(process.env.DAILY_LIMIT) || 20;
// 「換一句開場」另外計算，不佔每日生成次數
export const HOOK_DAILY_LIMIT = Number(process.env.HOOK_DAILY_LIMIT) || 40;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const redisReady = Boolean(REDIS_URL && REDIS_TOKEN);

export const normalize = code => String(code || '').trim().toUpperCase();

/* ---------- Redis（Upstash REST） ---------- */
export async function redis(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String))
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || '資料庫連線失敗');
  return data.result;
}

const codeKey = code => `code:${normalize(code)}`;

function envCodes() {
  return (process.env.ACCESS_CODES || '').split(/[\s,]+/).map(normalize).filter(Boolean);
}

/* ---------- 驗證 ---------- */
export async function isValidCode(code) {
  const c = normalize(code);
  if (!c) return false;
  if (envCodes().includes(c)) return true;
  if (!redisReady) return false;
  const raw = await redis('GET', codeKey(c));
  if (!raw) return false;
  try { return JSON.parse(raw).active !== false; } catch { return false; }
}

/* ---------- 每日次數 ---------- */
function todayTW() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function usageKey(code, kind = 'gen') {
  const id = createHash('sha256').update(normalize(code)).digest('hex').slice(0, 16);
  return kind === 'gen' ? `usage:${todayTW()}:${id}` : `usage-${kind}:${todayTW()}:${id}`;
}

// 回傳 { used, remaining }；沒有資料庫時 remaining 為 null（不限次數）
export async function getUsage(code, kind = 'gen', limit = DAILY_LIMIT) {
  if (!redisReady) return { used: 0, remaining: null };
  const used = Number(await redis('GET', usageKey(code, kind))) || 0;
  return { used, remaining: Math.max(0, limit - used) };
}

export async function addUsage(code, kind = 'gen', limit = DAILY_LIMIT) {
  if (!redisReady) return { used: 0, remaining: null };
  const key = usageKey(code, kind);
  const used = Number(await redis('INCR', key));
  if (used === 1) await redis('EXPIRE', key, 2 * 24 * 3600);
  return { used, remaining: Math.max(0, limit - used) };
}

/* ---------- 後台管理 ---------- */
export function isAdmin(password) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !password) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去掉容易看錯的 0 O 1 I L
const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export async function createCode(note) {
  for (let i = 0; i < 5; i++) {
    const code = `SV-${part()}-${part()}`;
    const record = { note: String(note || '').slice(0, 80), createdAt: Date.now(), active: true };
    const ok = await redis('SET', codeKey(code), JSON.stringify(record), 'NX');
    if (ok) {
      await redis('ZADD', 'codes', record.createdAt, code);
      return { code, ...record };
    }
  }
  throw new Error('產生密碼失敗，請再試一次');
}

export async function setActive(code, active) {
  const key = codeKey(code);
  const raw = await redis('GET', key);
  if (!raw) throw new Error('找不到這組密碼');
  const record = JSON.parse(raw);
  record.active = active;
  await redis('SET', key, JSON.stringify(record));
  return { code: normalize(code), ...record };
}

export async function listCodes() {
  const codes = await redis('ZREVRANGE', 'codes', 0, 499);
  if (!codes || !codes.length) return [];
  const records = await redis('MGET', ...codes.map(codeKey));
  const usage = await redis('MGET', ...codes.map(usageKey));
  return codes.map((code, i) => {
    let r = {};
    try { r = JSON.parse(records[i]) || {}; } catch {}
    return { code, note: r.note || '', createdAt: r.createdAt || 0, active: r.active !== false, usedToday: Number(usage[i]) || 0 };
  });
}
