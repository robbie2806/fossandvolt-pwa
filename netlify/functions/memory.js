// netlify/functions/memory.js
// Minimal working memory API using Netlify Blobs (no ESM config needed).

const { getStore } = require('@netlify/blobs');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  },
  body: JSON.stringify(body)
});

const ok = (data = {}) => json(200, data);
const bad = (msg, code = 400) => json(code, { status: 'error', message: msg });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return ok({ ok: true });

  const store = getStore({ name: 'volt-memory', consistency: 'strong' });

  try {
    const { httpMethod, queryStringParameters } = event;
    const action = (queryStringParameters && (queryStringParameters.action || '') || '').toLowerCase();

    if (httpMethod === 'GET') {
      if (action === 'latest-context') {
        const latest = await store.get('context/latest.json', { type: 'json' });
        return ok({ status: 'success', data: latest || null });
      }
      if (action === 'list') {
        const list = await store.list();
        return ok({ status: 'success', data: (list && list.blobs) || [] });
      }
      return ok({ status: 'success', message: 'Memory function alive ✅' });
    }

    if (httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); }
      catch { return bad('Invalid JSON body'); }

      const type = (body.type || '').toLowerCase();
      const now = new Date().toISOString();
      const ts = now.replace(/[:.]/g, '-');

      if (type === 'context' || type === 'context-summary') {
        const content = (body.content || '').trim();
        if (!content) return bad('Missing content');

        const payload = { type: 'context', savedAt: now, content };
        await store.set(`context/${ts}.json`, JSON.stringify(payload), { metadata: { kind: 'context' } });
        await store.set('context/latest.json', JSON.stringify(payload), { metadata: { kind: 'context' } });
        return ok({ status: 'success', message: 'Context saved' });
      }

      if (type === 'conversation') {
        const title = (body.title || '').trim();
        const content = (body.content || '').trim();
        if (!title || !content) return bad('Missing title or content');

        const category = body.category || 'general';
        const importance = body.importance || 'medium';
        const tags = Array.isArray(body.tags) ? body.tags : [];

        const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)) || 'untitled';

        const payload = { type: 'conversation', savedAt: now, title, content, category, importance, tags };
        await store.set(`conversations/${ts}-${slug}.json`, JSON.stringify(payload), {
          metadata: { kind: 'conversation', title }
        });
        return ok({ status: 'success', message: 'Conversation saved' });
      }

      return bad('Unknown type. Use "context" or "conversation".');
    }

    return bad('Method not allowed', 405);
  } catch (err) {
    return json(500, { status: 'error', message: err && err.message ? err.message : 'Server error' });
  }
};
