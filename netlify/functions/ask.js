exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "OK" };
    }
    if (event.httpMethod !== "POST") {
      return json({ ok: false, error: "POST only" }, 405);
    }

    const body = JSON.parse(event.body || "{}");
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      // Online mode (optional)
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are Volt. Be concise, helpful, and friendly." },
            ...messages.map(m => ({ role: m.role || "user", content: m.content || "" })),
          ],
          temperature: 0.8,
        }),
      });
      const data = await r.json();
      const reply = data?.choices?.[0]?.message?.content || "(no reply)";
      return json({ ok: true, mode: "Mode: online (OpenAI)", reply });
    }

    // Offline echo (always works)
    const lastUser = [...messages].reverse().find(m => (m.role || "") === "user")?.content || "";
    return json({ ok: true, mode: "Mode: offline echo", reply: `Volt (offline): you said → "${lastUser}"` });

  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
};

function json(obj, code = 200) {
  return { statusCode: code, headers: { "Content-Type": "application/json", ...cors() }, body: JSON.stringify(obj) };
}
function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
