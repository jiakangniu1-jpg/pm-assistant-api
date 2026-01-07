export default async function handler(req, res) {
  /* ================= CORS 处理 ================= */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 预检请求直接返回
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  /* ============================================ */

  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // 调用 DeepSeek
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是一名专业、理性、结构化表达的产品经理助手"
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        error: "DeepSeek API error",
        detail: errorText
      });
    }

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content || "未获取到有效回复";

    return res.json({
      reply
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Server error",
      detail: err.message
    });
  }
}
