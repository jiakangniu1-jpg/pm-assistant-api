export default async function handler(req, res) {
  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // 🔍 关键调试点 1：环境变量
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({
        error: "DEEPSEEK_API_KEY is missing"
      });
    }

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一名专业、结构化思考的产品经理助手"
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    // 🔍 关键调试点 2：DeepSeek 返回是否正常
    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "DeepSeek API error",
        status: response.status,
        detail: text
      });
    }

    const data = await response.json();

    return res.json({
      reply: data?.choices?.[0]?.message?.content
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server exception",
      detail: err.message
    });
  }
}

