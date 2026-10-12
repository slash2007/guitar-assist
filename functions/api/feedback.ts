import { feedbackText, parseFeedback } from "../../src/feedback";

interface Env {
  FEISHU_WEBHOOK_URL?: string;
}

const LIMIT_SECONDS = 30;

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const webhook = context.env.FEISHU_WEBHOOK_URL;
  if (!webhook) return json(503);

  if (await limited(context.request)) return json(429);

  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return json(400);
  }
  const input = parseFeedback(raw);
  if (!input) return json(400);

  const sent = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text: feedbackText(input) },
    }),
  });
  if (!sent.ok) return json(502);
  const result = (await sent.json().catch(() => null)) as { code?: number } | null;
  if (result?.code !== 0) return json(502);
  return json(204);
}

async function limited(request: Request): Promise<boolean> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const key = new Request(`https://feedback-limit.invalid/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  if (await cache.match(key)) return true;
  await cache.put(key, new Response(null, { headers: { "Cache-Control": `max-age=${LIMIT_SECONDS}` } }));
  return false;
}

function json(status: number): Response {
  return new Response(null, { status });
}
