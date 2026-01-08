// Node 18+ 自带 fetch，这里无需额外依赖
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  try {
    // CORS 预检
    if (req.method === "OPTIONS") {
      const reqHeaders = req.headers["access-control-request-headers"] || "Content-Type";
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", reqHeaders);
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { messages } = req.body || {};

    if (!messages) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(400).json({ error: "messages is required" });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is missing" });
    }

    // 关键：SSE 头 + CORS
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.flushHeaders?.();

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: true,
        messages,
      }),
    });

    // DeepSeek 返回非 2xx，直接转发错误文本并结束
    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "");
      res.write(`data: ERROR ${response.status}: ${errText || "no body"}\n\n`);
      res.write("event: end\ndata: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "");

          if (data === "[DONE]") {
            res.write(`event: end\ndata: [DONE]\n\n`);
            res.end();
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${content}\n\n`);
            }
          } catch (e) {
            // 如果不是合法 JSON，直接原样透传，方便排错
            res.write(`data: ${data}\n\n`);
          }
        }
      }
    }

    res.write(`event: end\ndata: [DONE]\n\n`);
    res.end();
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "server error", detail: err.message });
  }
}

