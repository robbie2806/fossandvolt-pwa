// netlify/functions/memory.js
// Works on Netlify Functions with @netlify/blobs.
// CommonJS + explicit bundler settings in netlify.toml.

const { getStore } = require('@netlify/blobs');

const res = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return res(200, { ok: true });

  try {
    const store = getStore({ name: 'volt-memory', consistency: 'strong' });
    const method = event.httpMethod;
    const qs = event.queryStringParameters || {};
    const action = (qs.action || '').toLowerCase();

    if (method === 'GET') {
      if (action === 'latest-context') {
        const latest = await store.get('context/latest.json', { type: 'json' });
        return res(200, { status: 'success', data: latest || null });
      }
      if (action === 'list') {
        const list = await store.list();
        return res(200, { status: 'success', data: (list && list.blobs) || [] });
      }
      return res(200, { status: 'success', message: 'Memory function alive ✅' });
    }

    if (method === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); }
      catch { return res(400, { status: 'error', message: 'Invalid JSON body' }); }

      const type = (body.type || '').toLowerCase();
      const now = new Date().toISOString();
      const ts = now.replace(/[:.]/g, '-');

      if (type === 'context' || type === 'context-summary') {
        const content = (body.content || '').trim();
        if (!content) return res(400, { status: 'error', message: 'Missing content' });

        const payload = { type: 'context', savedAt: now, content };
        await store.set(`context/${ts}.json`, JSON.stringify(payload), { metadata: { kind: 'context' } });
        await store.set('context/latest.json', JSON.stringify(payload), { metadata: { kind: 'context' } });
        return res(200, { status: 'success', message: 'Context saved' });
      }

      if (type === 'conversation') {
        const title = (body.title || '').trim();
        const content = (body.content || '').trim();
        if (!title || !content) return res(400, { status: 'error', message: 'Missing title or content' });

        const category = body.category || 'general';
        const importance = body.importance || 'medium';
        const tags = Array.isArray(body.tags) ? body.tags : [];

        const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || 'untitled';
        const payload = { type: 'conversation', savedAt: now, title, content, category, importance, tags };
        await store.set(`conversations/${ts}-${slug}.json`, JSON.stringify(payload), {
          metadata: { kind: 'conversation', title }
        });
        return res(200, { status: 'success', message: 'Conversation saved' });
      }

      return res(400, { status: 'error', message: 'Unknown type. Use "context" or "conversation".' });
    }

    return res(405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    return res(500, { status: 'error', message: e.message || 'Server error' });
  }
};
