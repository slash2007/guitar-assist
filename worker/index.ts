import { onRequestPost } from "../functions/api/feedback";

interface Env {
  ASSETS: Fetcher;
  FEISHU_WEBHOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/feedback") {
      if (request.method !== "POST") return new Response(null, { status: 405 });
      return onRequestPost({ request, env });
    }
    return env.ASSETS.fetch(request);
  },
};
