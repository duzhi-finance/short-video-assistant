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

  // 小白可能只填其中一欄，至少要有一欄
  if (!String(topic || '').trim() && !String(coreContent || '').trim()) {
    return res.status(400).json({ error: '至少寫一句你想拍的東西，或你最常聽到的抱怨' });
  }

  const sceneCount = duration === '60秒' ? '6 到 8' : '4 到 5';
  const wordCount = duration === '60秒' ? '250 到 280 字' : '120 到 140 字';

  const prompt = `你是台灣百萬流量等級的短影音操盤手，最擅長把素人模糊的想法，變成口語化、有共鳴、乾貨滿滿、拒絕官方腔的爆款腳本。
全部使用台灣繁體中文與台灣人日常說話的用語，不要用簡體字或大陸用語（例如不要用「視頻」「質量」「寶子們」「家人們」「絕絕子」，要說「影片」「品質」）。

【使用者的隨性想法】（可能很模糊、只有一句抱怨，或其中一欄是空的）
- 影片主題：${topic || '（沒寫，請從下方內容推斷）'}
- 心裡最直覺的抱怨／顧客常問的問題：${coreContent || '（沒寫，請從主題推斷最常見的痛點）'}
- 人設與風格：${style}
- 發布平台：${platform}
- 影片長度：${duration}（口白總字數約 ${wordCount}）

【第一步：白話翻譯與痛點拆解】
先替使用者想清楚：這支影片是拍給誰看？他們卡在哪個具體情境（時間、地點、動作）？他們心裡真正的焦慮或不甘心是什麼？
把答案濃縮成一句「拍攝角度」放在 angle。如果使用者寫得很空泛（例如只寫「我想拍美妝」），就挑一個最多人有共鳴、最具體的痛點來切入，不要寫成面面俱到的大雜燴。

【嚴格撰寫原則】
1. 絕對不官方：禁止「各位觀眾大家好」「今天我們要來探討」「哈囉大家」「在這個快節奏的時代」這類開場和冗言贅字。口白要像深夜跟好朋友聊天、老朋友真心勸你那樣自然、犀利、接地氣。可以用短句、反問、停頓，但不要誇張推銷或硬塞流行語。
2. 3 個 Hook 要狠戳痛點，角度完全不同，每句 3 秒內講得完：
   - 血淚控訴型：直接說出觀眾正在犯的錯和後果。例：「如果你化妝也常犯這個錯，難怪底妝永遠像戴面具…」
   - 反常識打臉型：推翻大家深信不疑的做法。例：「誰跟你妝前乳要塗全臉？難怪你不到中午就脫妝！」
   - 閨蜜真心話型：掏心掏肺、像私下勸告。例：「拜託，真心勸你，不想再花冤枉錢買粉底，先聽我說完這句…」
   範例只是示意語氣，請依使用者的主題重新寫，不要照抄。
3. 分鏡要超具體、有乾貨：
   - visual 要告訴新手「手在做什麼、鏡頭怎麼擺、畫面上打什麼字卡」，例如「手機架在胸口高度、近拍手背上擠出黃豆大小的粉底，字卡：『只要這樣就夠』」，不要只寫「特寫畫面」。
   - audio 要給真正能照做的方法：具體步驟、正確順序、份量或時間、常見地雷怎麼避開。每段至少一個可以馬上照做的重點，再搭一句讓人想截圖的金句。
4. CTA 要自然：用一個跟主題有關、好回答的問題引導留言，或提醒收藏／私訊，不要說「記得按讚訂閱開啟小鈴鐺」。
5. coverTitles 給 3 個封面大字，每個 12 字以內，要有衝突感或好奇心，適合 ${platform}。
6. hashtags 給 6 到 8 個適合 ${platform} 的標籤，熱門標籤和精準標籤都要有，用空格分隔。

只回傳合法 JSON，不要有 Markdown 標記或任何其他文字，格式如下：
{
  "angle": "一句話說明這支影片的拍攝角度與要戳的痛點",
  "title": "吸睛的企劃主標題",
  "estimatedTime": "${duration}",
  "paceHint": "語速、情緒與氛圍建議",
  "hooks": [
    { "type": "血淚控訴型", "line": "開場台詞", "visual": "開場畫面與動作" },
    { "type": "反常識打臉型", "line": "開場台詞", "visual": "開場畫面與動作" },
    { "type": "閨蜜真心話型", "line": "開場台詞", "visual": "開場畫面與動作" }
  ],
  "storyboard": [
    { "visual": "具體的拍攝畫面、手部動作、鏡頭位置與字卡", "audio": "口語化、有乾貨、有節奏的口白" }
  ],
  "cta": "自然引導留言、收藏或私訊的結尾台詞",
  "coverTitles": ["封面大字1", "封面大字2", "封面大字3"],
  "hashtags": "#標籤1 #標籤2 #標籤3"
}
storyboard 請給 ${sceneCount} 段。`;

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
