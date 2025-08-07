import { sendSSEToSubscribers } from "@/lib/sse-server";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { eventName, event, payload } = await req.json();

    if (!eventName || !event) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "eventName and event are required",
        }),
        { status: 400 },
      );
    }

    await sendSSEToSubscribers(eventName, event, payload || {});

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
