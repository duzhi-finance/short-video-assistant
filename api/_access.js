// 密碼驗證與每日次數（檔名以底線開頭，Vercel 不會把它當成網址）
//
// Vercel 環境變數：
//   ACCESS_CODES   必填。有效密碼清單，用逗號或換行分隔，例如：SV-7K3P-Q9ME,SV-M2XD-4HTA
//   DAILY_LIMIT    選填。每組密碼每天可生成次數，預設 20
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//                  選填。有設定才會計算每日次數（Vercel Marketplace 加 Upstash Redis 會自動帶入，
//                  也接受 KV_REST_API_URL / KV_REST_API_TOKEN）。沒設定時不限次數。

import { createHash } from 'node:crypto';

export const DAILY_LIMIT = Number(process.env.DAILY_LIMIT) || 20;

const normalize = code => String(code || '').trim().toUpperCase();

export function isValidCode(code) {
  const c = normalize(code);
  if (!c) return false;
  const list = (process.env.ACCESS_CODES || '')
    .split(/[\s,]+/)
    .map(normalize)
    .filter(Boolean);
  return list.includes(c);
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const usageTracked = Boolean(REDIS_URL && REDIS_TOKEN);

// 台灣時間的今天日期，額度每天 00:00 重置
function todayTW() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function usageKey(code) {
  const id = createHash('sha256').update(normalize(code)).digest('hex').slice(0, 16);
  return `usage:${todayTW()}:${id}`;
}

async function redis(...parts) {
  const res = await fetch(`${REDIS_URL}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Redis 連線失敗');
  return data.result;
}

// 回傳 { used, remaining }；沒有設定 Redis 時 remaining 為 null（不限次數）
export async function getUsage(code) {
  if (!usageTracked) return { used: 0, remaining: null };
  const used = Number(await redis('get', usageKey(code))) || 0;
  return { used, remaining: Math.max(0, DAILY_LIMIT - used) };
}

export async function addUsage(code) {
  if (!usageTracked) return { used: 0, remaining: null };
  const key = usageKey(code);
  const used = Number(await redis('incr', key));
  if (used === 1) await redis('expire', key, String(2 * 24 * 3600));
  return { used, remaining: Math.max(0, DAILY_LIMIT - used) };
}
