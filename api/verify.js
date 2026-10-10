// 檢查密碼是否有效，並回傳今天剩餘次數
import { isValidCode, getUsage, DAILY_LIMIT } from './_access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST' });
  }
  const { code } = req.body || {};
  if (!isValidCode(code)) {
    return res.status(401).json({ ok: false, error: '密碼不正確，請確認付款完成通知裡的密碼' });
  }
  try {
    const usage = await getUsage(code);
    return res.status(200).json({ ok: true, dailyLimit: DAILY_LIMIT, ...usage });
  } catch (err) {
    // 計次服務暫時出問題時，仍讓買家進入
    return res.status(200).json({ ok: true, dailyLimit: DAILY_LIMIT, used: 0, remaining: null });
  }
}
