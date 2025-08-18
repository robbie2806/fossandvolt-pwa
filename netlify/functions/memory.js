// netlify/functions/memory.js
// Minimal, working memory backend using Netlify Blobs.
// Supports: ping, save context, save conversation, list, latest-context.

import { getStore } from '@netlify/blobs';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

const ok = (data = {}) => json(200, data);
const bad = (msg, code = 400) => json(code, { status: 'error', message: msg });

export async function handler(event) {
  // Preflight for Safari/iOS
  if (event.httpMethod === 'OPTIONS') {
    return ok({ ok: true });
  }

  // Strong consistency so your iPhone sees writes immediately.
  const store = getStore({ name: 'volt-memory', consistency: 'strong' });

  try {
    const { httpMethod, queryStringParameters } = event;
    const action = (queryStringParameters?.action || '').toLowerCase();

    // -------- GET routes --------
    if (httpMethod === 'GET') {
      if (action === 'latest-context') {
        const latest = await store.get('context/latest.json', { type: 'json' });
        return ok({
          status: 'success',
          data: latest || null,
        });
      }

      if (action === 'list') {
        const list = await store.list(); // returns {blobs:[{key, size}]}
        return ok({
          status: 'success',
          data: list?.blobs ?? [],
        });
      }

      // default ping
      return ok({
        status: 'success',
        message: 'Memory function alive ✅',
      });
    }

    // -------- POST routes --------
    if (httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return bad('Invalid JSON body');
      }

      const type = (body.type || '').toLowerCase();
      const now = new Date().toISOString();
      const ts = now.replace(/[:.]/g, '-'); // safe key

      // Save a 3-month context summary (or general context)
      if (type === 'context' || type === 'context-summary') {
        const content = (body.content || '').trim();
        if (!content) return bad('Missing content');

        const payload = {
          type: 'context',
          savedAt: now,
          content,
        };

        // versioned write + update "latest"
        await store.set(`context/${ts}.json`, JSON.stringify(payload), {
          metadata: { kind: 'context' },
        });
        await store.set('context/latest.json', JSON.stringify(payload), {
          metadata: { kind: 'context' },
        });

        return ok({ status: 'success', message: 'Context saved' });
      }

      // Save a conversation snippet
      if (type === 'conversation') {
        const title = (body.title || '').trim();
        const content = (body.content || '').trim();
        if (!title || !content) return bad('Missing title or content');

        const category = body.category || 'general';
        const importance = body.importance || 'medium';
        const tags = Array.isArray(body.tags) ? body.tags : [];

        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'untitled';

        const payload = {
          type: 'conversation',
          savedAt: now,
          title,
          content,
          category,
          importance,
          tags,
        };

        await store.set(`conversations/${ts}-${slug}.json`, JSON.stringify(payload), {
          metadata: { kind: 'conversation', title },
        });

        return ok({ status: 'success', message: 'Conversation saved' });
      }

      return bad('Unknown type. Use "context" or "conversation".');
    }

    return bad('Method not allowed', 405);
  } catch (err) {
    return json(500, { status: 'error', message: err?.message || 'Server error' });
  }
}
