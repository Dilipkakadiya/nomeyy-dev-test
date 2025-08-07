import { sseManager } from "@/lib/sse-server";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { event, payload } = await req.json();
    sseManager.broadcast({ event, data: payload });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
