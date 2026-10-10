// 生成企劃。環境變數：GEMINI_API_KEY（必填），密碼與次數設定見 _access.js
import { isValidCode, getUsage, addUsage, DAILY_LIMIT } from './_access.js';

// 模型名稱。Google 換新模型時，在 Vercel 環境變數設定 GEMINI_MODEL 就能更換，不用改程式
// 預設用速度快、成本低的 Flash-Lite；想要更強的模型可設 GEMINI_MODEL=gemini-3.8-flash（比較慢）
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '後端沒有設定 GEMINI_API_KEY' });
  }

  const { code, topic, coreContent, style, duration, platform = '全平台通用' } = req.body || {};

  let valid;
  try {
    valid = await isValidCode(code);
  } catch {
    return res.status(503).json({ error: '系統忙碌中，請稍後再試' });
  }
  if (!valid) {
    return res.status(401).json({ error: '密碼無效，請重新輸入' });
  }

  try {
    const { remaining } = await getUsage(code);
    if (remaining === 0) {
      return res.status(429).json({ error: `今天的 ${DAILY_LIMIT} 次已經用完，明天 00:00 會恢復` });
    }
  } catch {
    // 計次服務暫時出問題時不擋生成
  }

  if (!topic || !coreContent) {
    return res.status(400).json({ error: '請填寫主題與核心內容' });
  }

  const sceneCount = duration === '60秒' ? '6 到 8' : '4 到 5';

  const prompt = `你是台灣的短影音企劃。請用台灣繁體中文與台灣慣用語，不要用簡體字或大陸用語。

影片主題：${topic}
核心內容：${coreContent}
人設與風格：${style}
影片長度：${duration}
發布平台：${platform}

要求：
- 口白要像真人自然說話，不要有廣告腔或誇張推銷感
- hooks 固定 3 個，type 依序為「痛點共鳴型」「反常識顛覆型」「懸念好奇型」，line 是 3 秒內講得完的開場台詞，visual 是開場畫面
- storyboard 給 ${sceneCount} 段，每段包含 visual（鏡頭畫面與運鏡）與 audio（口白台詞）
- 口白總長度要符合 ${duration}
- cta 要引導觀眾留言互動，用提問製造留言動機
- coverTitles 給 3 個封面大字，每個 12 字以內，適合 ${platform}
- hashtags 給 6 到 8 個適合 ${platform} 的熱門與精準標籤，用空格分隔

只回傳 JSON，格式如下，不要有任何其他文字：
{
  "title": "影片標題",
  "estimatedTime": "${duration}",
  "paceHint": "語速與節奏提示",
  "hooks": [
    { "type": "痛點共鳴型", "line": "開場台詞", "visual": "開場畫面" },
    { "type": "反常識顛覆型", "line": "開場台詞", "visual": "開場畫面" },
    { "type": "懸念好奇型", "line": "開場台詞", "visual": "開場畫面" }
  ],
  "storyboard": [{ "visual": "畫面", "audio": "口白" }],
  "cta": "結尾互動句",
  "coverTitles": ["封面大字1", "封面大字2", "封面大字3"],
  "hashtags": "#標籤1 #標籤2 #標籤3"
}`;

  // 呼叫 Gemini；lowThinking 會請模型少想一點、回答快一點
  const callGemini = async lowThinking => {
    const generationConfig = { responseMimeType: 'application/json' };
    if (lowThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
        signal: AbortSignal.timeout(55000),
      }
    );
    return { r, data: await r.json() };
  };

  try {
    let { r: aiRes, data: aiData } = await callGemini(true);
    // 如果這個模型不支援調整思考程度，改用預設設定再試一次
    if (aiRes.status === 400 && /think/i.test(aiData.error?.message || '')) {
      ({ r: aiRes, data: aiData } = await callGemini(false));
    }
    if (!aiRes.ok) {
      return res.status(500).json({ error: aiData.error?.message || 'AI 服務出錯' });
    }

    // 只取正式回答的部分（略過模型的思考內容）
    let text = (aiData.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought && p.text)
      .map(p => p.text)
      .join('');
    // 保險：清掉可能出現的 ```json 包裝
    text = text.replace(/```json|```/g, '').trim();

    const result = JSON.parse(text);

    // 檢查前端需要的欄位
    if (!Array.isArray(result.hooks) || !Array.isArray(result.storyboard)) {
      return res.status(500).json({ error: 'AI 回傳格式不完整，請再試一次' });
    }

    let usage = { remaining: null };
    try { usage = await addUsage(code); } catch {}

    return res.status(200).json({ result, remaining: usage.remaining, dailyLimit: DAILY_LIMIT });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 回應太久，請再按一次生成' });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'AI 回傳格式不完整，請再試一次' });
    }
    return res.status(500).json({ error: '生成失敗：' + err.message });
  }
}
