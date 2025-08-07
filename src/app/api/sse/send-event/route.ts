import { sseManager } from "@/lib/sse-server";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { clientIds, event, payload } = await req.json();
    if (!Array.isArray(clientIds) || !event) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid input" }),
        { status: 400 },
      );
    }
    console.info("[SSE] Sending event to clients:", {
      clientIds,
      event,
      payload,
    });
    for (const clientId of clientIds) {
      sseManager.sendEventToClient(clientId, { event, data: payload });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
