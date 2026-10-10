export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { topic, coreContent, style, duration } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: '伺服器未設定 API Key' });
  }

  const prompt = `
你是一位精通 Short-form (IG Reels, TikTok, YouTube Shorts) 的短影音爆款導演。
請根據使用者需求，製作一份適合新手拍攝的結構化短影音腳本企劃。

【使用者需求】
- 影片主題：${topic}
- 核心內容：${coreContent}
- 影片風格：${style}
- 預計長度：${duration}

【製作原則】
1. 開場 Hook 必須強烈（3秒內抓住注意力，使用痛點共鳴/反常識/驚喜懸念）。
2. 口白字數需符合長度（30秒約 120-140 字，60秒約 250-280 字），語氣自然生動。
3. 拍攝畫面需給予新手明確、具體的鏡頭視覺提示。

請【嚴格】僅輸出合法 JSON 格式，不可以包含任何 Markdown 格式標籤 (如 \`\`\`json )，結構如下：
{
  "title": "企劃標題",
  "estimatedTime": "預估秒數",
  "paceHint": "語速建議",
  "hook": "開場第1-3秒的吸睛台詞",
  "storyboard": [
    {
      "visual": "拍攝畫面/運鏡/字卡說明",
      "audio": "對應口白台詞"
    }
  ],
  "cta": "結尾引導互動台詞"
}
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(text);
    return res.status(200).json({ result: parsedData });
  } catch (err) {
    return res.status(500).json({ error: 'AI 產生企劃失敗：' + err.message });
  }
}
