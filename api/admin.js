// 管理後台 API：列出、產生、停用、啟用密碼
import { isAdmin, redisReady, createCode, setActive, listCodes, DAILY_LIMIT } from './_access.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST' });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: '還沒有設定 ADMIN_PASSWORD，請到 Vercel 環境變數新增後 Redeploy' });
  }

  const { adminPassword, action, code, note } = req.body || {};
  if (!isAdmin(adminPassword)) {
    return res.status(401).json({ error: '管理密碼不正確' });
  }
  if (!redisReady) {
    return res.status(500).json({ error: '還沒有連接資料庫，請到 Vercel 專案的 Storage 加上 Upstash Redis 後 Redeploy' });
  }

  try {
    switch (action) {
      case 'list':
        return res.status(200).json({ codes: await listCodes(), dailyLimit: DAILY_LIMIT });
      case 'create':
        return res.status(200).json({ created: await createCode(note) });
      case 'disable':
        return res.status(200).json({ updated: await setActive(code, false) });
      case 'enable':
        return res.status(200).json({ updated: await setActive(code, true) });
      default:
        return res.status(400).json({ error: '不支援的操作' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
