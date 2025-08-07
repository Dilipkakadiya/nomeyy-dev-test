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

    console.log(
      `[TEST] Sending event '${event}' to subscribers of '${eventName}'`,
    );
    await sendSSEToSubscribers(eventName, event, payload || {});

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Event '${event}' sent to subscribers of '${eventName}'`,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
