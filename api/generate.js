// 生成企劃。環境變數：GEMINI_API_KEY（必填），密碼與次數設定見 _access.js
import { isValidCode, getUsage, addUsage, DAILY_LIMIT, HOOK_DAILY_LIMIT } from './_access.js';

// 模型名稱。Google 換新模型時，在 Vercel 環境變數設定 GEMINI_MODEL 就能更換，不用改程式
// 預設用速度快、成本低的 Flash-Lite；想要更強的模型可設 GEMINI_MODEL=gemini-3.8-flash（比較慢）
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

// 呼叫 Gemini，回傳解析好的 JSON；先請模型少想一點，不支援時改用預設設定
async function askGemini(apiKey, prompt, timeoutMs = 55000) {
  const call = async lowThinking => {
    const generationConfig = { responseMimeType: 'application/json' };
    if (lowThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    return { r, data: await r.json() };
  };
  let { r, data } = await call(true);
  if (r.status === 400 && /think/i.test(data.error?.message || '')) ({ r, data } = await call(false));
  if (!r.ok) {
    const e = new Error(data.error?.message || 'AI 服務出錯');
    e.upstream = true;
    throw e;
  }
  // 只取正式回答的部分（略過模型的思考內容），並清掉可能的 ```json 包裝
  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter(p => !p.thought && p.text)
    .map(p => p.text)
    .join('')
    .replace(/```json|```/g, '')
    .trim();
  return JSON.parse(text);
}

function sendError(res, err) {
  if (err.name === 'TimeoutError' || err.name === 'AbortError') {
    return res.status(504).json({ error: 'AI 回應太久，請再按一次' });
  }
  if (err instanceof SyntaxError) {
    return res.status(500).json({ error: 'AI 回傳格式不完整，請再試一次' });
  }
  return res.status(500).json({ error: err.upstream ? err.message : '生成失敗：' + err.message });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只接受 POST' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '後端沒有設定 GEMINI_API_KEY' });
  }

  const { code, mode, topic, coreContent, style, duration, platform = '全平台通用' } = req.body || {};

  let valid;
  try {
    valid = await isValidCode(code);
  } catch {
    return res.status(503).json({ error: '系統忙碌中，請稍後再試' });
  }
  if (!valid) {
    return res.status(401).json({ error: '密碼無效，請重新輸入' });
  }

  // 只換一個開場：另外計次，不佔每日生成次數
  if (mode === 'hook') return regenerateHook(req, res, apiKey);

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

  const prompt = `你是一位頂尖的短影音（IG Reels / TikTok / YouTube Shorts）流量操盤手與爆款編導，最擅長把素人模糊的想法，變成一份「完全告別說教感、極度生活化、乾貨滿滿、拿了就能直接拍」的實戰腳本。
整份腳本絕對不要像 AI 寫的、也不要像文章，要像真人對著鏡頭講話。
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
1. 絕對不官方、不說教：禁止「各位觀眾」「大家好」「今天我們要來探討」「哈囉大家」「在這個快節奏的時代」這類開場和冗言贅字。口白要像深夜跟好朋友聊天、老朋友真心勸你那樣自然、犀利、接地氣。可以用短句、反問、停頓，但不要誇張推銷或硬塞流行語。
2. 3 個 Hook 要非常抓耳、像在跟好朋友對話，角度完全不同，每句 3 秒內講得完。多用這類口語起手：「妳是不是也常常…」「真心勸妳…」「誰還不知道這件事…」「拜託…」。
   - 痛點共鳴型：像私下聊天抱怨，直接說出觀眾正在犯的錯和後果。例：「如果你化妝也常犯這個錯，難怪底妝永遠像戴面具…」
   - 反常識打臉型：犀利打破迷思，推翻大家深信不疑的做法。例：「誰跟你妝前乳要塗全臉？難怪你不到中午就脫妝！」
   - 掏心掏肺型：真心勸告的私房話。例：「拜託，真心勸你，不想再花冤枉錢買粉底，先聽我說完這句…」
   範例只是示意語氣，請依使用者的主題重新寫，不要照抄。用「妳」或「你」請配合主題的主要觀眾。
3. 分鏡要有畫面感、有乾貨：
   - visual 要明確指示動作、鏡頭和字卡，告訴新手手在做什麼、鏡頭怎麼擺。例如「手機鏡頭拉近特寫素顏」「手拿空瓶直接丟掉」「畫面瞬間切換到殘留卡粉的近照」「鏡頭直接貼近臉部，手指向鏡頭前一推」。不要只寫「特寫畫面」。
   - audio 要像真人講話一樣俐落、有節奏感，直接給出能照做的具體步驟、正確順序、份量或時間、避坑方法，拒絕廢話。每段至少一個可以馬上照做的重點，再搭一句讓人想截圖的金句。
4. paceHint 要具體到演出方式，例如「語速快、前 3 秒眼神要犀利」「講到第二步時放慢，像在說祕密」。
5. CTA 要自然：用一個跟主題有關、好回答的問題引導留言、點讚或收藏，也可以引導私訊，不要說「記得按讚訂閱開啟小鈴鐺」這種制式句。
6. coverTitles 給 3 個封面大字，每個 12 字以內，要有衝突感或好奇心，適合 ${platform}。
7. hashtags 給 6 到 8 個適合 ${platform} 的標籤，熱門標籤和精準標籤都要有，用空格分隔。

只回傳合法 JSON，不要有 Markdown 標記或任何其他文字，格式如下：
{
  "angle": "一句話說明這支影片的拍攝角度與要戳的痛點",
  "title": "吸睛的企劃主標題",
  "estimatedTime": "${duration}",
  "paceHint": "語速與情緒節奏，例如：語速快、前 3 秒眼神要犀利",
  "hooks": [
    { "type": "痛點共鳴型", "line": "開場台詞", "visual": "開場畫面與動作" },
    { "type": "反常識打臉型", "line": "開場台詞", "visual": "開場畫面與動作" },
    { "type": "掏心掏肺型", "line": "開場台詞", "visual": "開場畫面與動作" }
  ],
  "storyboard": [
    { "visual": "具體的拍攝畫面、手部動作、鏡頭位置與字卡", "audio": "口語化、有乾貨、有節奏的口白" }
  ],
  "cta": "自然引導留言、點讚、收藏或私訊的結尾台詞",
  "coverTitles": ["封面大字1", "封面大字2", "封面大字3"],
  "hashtags": "#標籤1 #標籤2 #標籤3"
}
storyboard 請給 ${sceneCount} 段。`;

  try {
    const result = await askGemini(apiKey, prompt);

    // 檢查前端需要的欄位
    if (!Array.isArray(result.hooks) || !Array.isArray(result.storyboard)) {
      return res.status(500).json({ error: 'AI 回傳格式不完整，請再試一次' });
    }

    let usage = { remaining: null };
    try { usage = await addUsage(code); } catch {}

    return res.status(200).json({ result, remaining: usage.remaining, dailyLimit: DAILY_LIMIT });
  } catch (err) {
    return sendError(res, err);
  }
}

const HOOK_GUIDE = {
  '痛點共鳴型': '像私下聊天抱怨，直接說出觀眾正在犯的錯和後果',
  '反常識打臉型': '犀利打破迷思，推翻大家深信不疑的做法',
  '掏心掏肺型': '真心勸告的私房話，像好朋友拉著你說'
};

async function regenerateHook(req, res, apiKey) {
  const { code, topic, coreContent, style, platform = '全平台通用', hookType, angle, title, avoid } = req.body || {};

  try {
    const { remaining } = await getUsage(code, 'hook', HOOK_DAILY_LIMIT);
    if (remaining === 0) {
      return res.status(429).json({ error: `今天「換一句」的 ${HOOK_DAILY_LIMIT} 次已經用完，可以整份重新生成，或明天再換` });
    }
  } catch {}

  const type = String(hookType || '痛點共鳴型').slice(0, 20);
  const avoidList = (Array.isArray(avoid) ? avoid : []).slice(0, 6).map(a => `- ${String(a).slice(0, 120)}`).join('\n');

  const prompt = `你是台灣頂尖的短影音編導。請為下面這支影片重新寫「一句」開場 Hook。
全部使用台灣繁體中文與台灣人日常說話的用語，不要用大陸用語。

影片主題：${topic || '（沒寫）'}
觀眾的抱怨／常問的問題：${coreContent || '（沒寫）'}
拍攝角度：${angle || '（沒寫）'}
影片標題：${title || '（沒寫）'}
人設與風格：${style || '（沒寫）'}
平台：${platform}

開場類型：${type}（${HOOK_GUIDE[type] || '狠戳痛點、像跟好朋友講話'}）

要求：
- 3 秒內講得完，像真人對著鏡頭講話，口語、抓耳，可以用「妳是不是也常常…」「真心勸妳…」「誰還不知道這件事…」這類起手
- 禁止「各位觀眾」「大家好」「今天我們要來探討」這類官方開場
- 要跟下面這些已經寫過的開場明顯不同，不要換字重寫：
${avoidList || '- （無）'}

只回傳合法 JSON：{ "type": "${type}", "line": "開場台詞", "visual": "開場畫面、手部動作與鏡頭位置" }`;

  try {
    const hook = await askGemini(apiKey, prompt, 40000);
    if (!hook || !hook.line) return res.status(500).json({ error: 'AI 回傳格式不完整，請再試一次' });
    let usage = { remaining: null };
    try { usage = await addUsage(code, 'hook', HOOK_DAILY_LIMIT); } catch {}
    return res.status(200).json({ hook: { type, line: hook.line, visual: hook.visual || '' }, hookRemaining: usage.remaining });
  } catch (err) {
    return sendError(res, err);
  }
}
