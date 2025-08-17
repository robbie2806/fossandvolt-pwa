// netlify/functions/conversations.js
const fs = require('fs');
const path = require('path');

function tryLoad() {
  const candidates = [
    path.resolve(__dirname, '../../data/conversations.json'), // recommended
    path.resolve(__dirname, '../../data/chatgpt_export.json'), // alt name
    path.resolve(__dirname, '../../conversations.json')       // fallback
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const txt = fs.readFileSync(p, 'utf8');
        return { json: JSON.parse(txt), source: p };
      }
    } catch (_) { /* ignore */ }
  }
  return { json: null, source: null };
}

function normalize(json) {
  const out = [];
  if (!json) return out;

  // Case A: ChatGPT export style: { conversations: [ ... ] }
  if (Array.isArray(json.conversations)) {
    for (const c of json.conversations) {
      const msgs = [];
      const mapping = c.mapping || {};
      for (const k of Object.keys(mapping)) {
        const m = mapping[k];
        if (!m || !m.message || !m.message.content) continue;
        const role = m.message.author?.role || 'user';
        let text = '';
        if (Array.isArray(m.message.content.parts)) text = m.message.content.parts.join('\n');
        else if (typeof m.message.content.text === 'string') text = m.message.content.text;
        msgs.push({ role, content: text, ts: m.message.create_time || c.create_time || Date.now() });
      }
      msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      out.push({ id: c.id || String(Math.random()).slice(2), title: c.title || 'Untitled', created: c.create_time || Date.now(), messages: msgs });
    }
    return out;
  }

  // Case B: simple custom array [{id,title,created,messages:[{role,content,ts}]}]
  if (Array.isArray(json)) {
    for (const c of json) {
      out.push({
        id: c.id || String(Math.random()).slice(2),
        title: c.title || 'Untitled',
        created: c.created || Date.now(),
        messages: Array.isArray(c.messages) ? c.messages : []
      });
    }
    return out;
  }

  return out;
}

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const q = (qs.q || '').toString().trim();
    const id = (qs.id || '').toString().trim();

    const { json } = tryLoad();
    const convos = normalize(json);

    if (id) {
      const thread = convos.find(c => c.id === id);
      if (!thread) return { statusCode: 404, body: JSON.stringify({ ok: false, error: 'thread_not_found' }) };
      return { statusCode: 200, body: JSON.stringify({ ok: true, thread }) };
    }

    let list = convos;
    if (q) {
      const L = q.toLowerCase();
      list = list.filter(c =>
        (c.title || '').toLowerCase().includes(L) ||
        (c.messages || []).some(m => (m.content || '').toLowerCase().includes(L))
      );
    }

    if (!json || list.length === 0) {
      // Return a tiny sample so the UI works even without a file
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          sample: true,
          conversations: [{ id: 'sample-1', title: 'Sample conversation', created: Date.now(), count: 2 }]
        })
      };
    }

    const payload = list.map(c => ({ id: c.id, title: c.title, created: c.created, count: (c.messages || []).length }));
    return { statusCode: 200, body: JSON.stringify({ ok: true, conversations: payload }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
