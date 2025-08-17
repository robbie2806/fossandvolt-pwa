// netlify/functions/ask.js
// Works out of the box. If OPENAI_API_KEY is missing, it falls back to a local echo reply.

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, reply: "Ask endpoint alive ✅ (POST a JSON {message})" }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {}
    const message = (body.message || '').toString().trim();

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'No message' }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // Fallback that ALWAYS works without any setup.
    if (!apiKey) {
      const reply = `Volt (offline): you said → "${message}"`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, reply }) };
    }

    // Live mode with OpenAI (requires OPENAI_API_KEY in Netlify env vars)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',       // pick a small/cheap model; change if you prefer
        messages: [
          { role: 'system', content: 'You are Volt, a concise, helpful assistant.' },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ ok: false, error: data.error?.message || 'OpenAI error' }) };
    }

    const reply = data.choices?.[0]?.message?.content || 'No reply';
    return { statusCode: 200, body: JSON.stringify({ ok: true, reply }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
