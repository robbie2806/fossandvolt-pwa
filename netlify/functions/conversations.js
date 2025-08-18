const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "OK" };
    }

    // Try reading from the repo (best for Netlify builds)
    const candidates = [
      path.resolve(__dirname, "../../data/conversations.json"),
      path.resolve(__dirname, "../../conversations.json"),
    ];

    let raw = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        raw = fs.readFileSync(p, "utf8");
        break;
      }
    }

    // Fallback: fetch from public URL (/data/conversations.json)
    if (!raw) {
      const host = event.headers["x-forwarded-host"] || event.headers["host"];
      const proto = event.headers["x-forwarded-proto"] || (host && host.includes("localhost") ? "http" : "https");
      const base = `${proto}://${host}`;
      const url = `${base}/data/conversations.json`;
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) raw = await r.text();
    }

    // If still nothing, return sample so UI works
    if (!raw) {
      return json({
        ok: true,
        sample: true,
        conversations: [{ id: "sample-1", title: "Sample conversation", created: Date.now(), count: 2 }],
      });
    }

    // Parse + normalize
    const parsed = parseMaybeJsonl(raw);
    const convos = normalize(parsed);

    // Route
    const qsp = event.queryStringParameters || {};
    const id = (qsp.id || "").toString();
    const q = (qsp.q || "").toString().trim().toLowerCase();

    if (id) {
      const thread = convos.find((c) => String(c.id) === String(id));
      if (!thread) return json({ ok: false, error: "not_found" }, 404);
      return json({ ok: true, thread });
    }

    let list = convos.map((c) => ({
      id: c.id,
      title: c.title,
      created: c.created,
      count: (c.messages || []).length,
    }));

    if (q) {
      list = list.filter((c) => {
        const t = convos.find((x) => x.id === c.id);
        return (c.title || "").toLowerCase().includes(q) || (t?.messages || []).some((m) => (m.content || "").toLowerCase().includes(q));
      });
    }

    list.sort((a, b) => (b.created || 0) - (a.created || 0));
    return json({ ok: true, conversations: list, sample: false });
  } catch (e) {
    return json({
      ok: true,
      sample: true,
      conversations: [{ id: "sample-1", title: "Sample conversation", created: Date.now(), count: 2 }],
    });
  }
};

/* helpers */
function json(obj, code = 200) {
  return { statusCode: code, headers: { "Content-Type": "application/json", ...cors() }, body: JSON.stringify(obj) };
}
function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
function parseMaybeJsonl(text) {
  try { return JSON.parse(text); } catch {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const arr = [];
    for (const l of lines) { try { arr.push(JSON.parse(l)); } catch {} }
    if (arr.length) return arr;
    throw new Error("Unrecognized JSON");
  }
}
function normalize(input) {
  if (Array.isArray(input) && input[0]?.messages) {
    return input.map((c, i) => ({
      id: c.id || i,
      title: c.title || `Conversation ${i + 1}`,
      created: toEpoch(c.create_time || c.created || Date.now()),
      messages: (c.messages || []).map((m) => ({
        role: m.role || m.author?.role || "user",
        content: m.content?.parts?.join?.("") ?? m.content?.text ?? m.content ?? "",
        ts: toEpoch(m.create_time || m.ts || c.create_time || Date.now()),
      })),
    }));
  }
  if (input && Array.isArray(input.conversations)) {
    return input.conversations.map((c, i) => ({
      id: c.id || c.conversation_id || i,
      title: c.title || `Conversation ${i + 1}`,
      created: toEpoch(c.create_time || c.created || Date.now()),
      messages: (c.mapping ? mapMapping(c.mapping, c) : c.messages || []).map((m) => ({
        role: m.role || m.author?.role || "user",
        content: m.content?.parts?.join?.("") ?? m.content?.text ?? m.content ?? "",
        ts: toEpoch(m.create_time || c.create_time || Date.now()),
      })),
    }));
  }
  return [{
    id: "conv-1",
    title: "Imported conversation",
    created: Date.now(),
    messages: Array.isArray(input) ? input : [{ role: "system", content: "Raw import" }],
  }];
}
function mapMapping(mapping, conv) {
  const msgs = [];
  for (const k of Object.keys(mapping)) {
    const node = mapping[k]; const m = node?.message; if (!m) continue;
    const role = m.author?.role; if (role !== "user" && role !== "assistant") continue;
    let content = "";
    if (Array.isArray(m.content?.parts)) content = m.content.parts.join("");
    else if (typeof m.content?.text === "string") content = m.content.text;
    else if (typeof m.content === "string") content = m.content;
    msgs.push({ role, content: content || "", ts: toEpoch(m.create_time || conv.create_time || Date.now()) });
  }
  msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return msgs;
}
function toEpoch(v) {
  if (!v) return undefined;
  if (typeof v === "number") return v > 2e12 ? v : (v < 1e12 ? v * 1000 : v);
  const t = Date.parse(v); return isNaN(t) ? undefined : t;
}
