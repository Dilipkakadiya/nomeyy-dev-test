import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionToken = searchParams.get("sessionToken");
    const eventName = searchParams.get("eventName");

    const where: any = {};
    if (sessionToken) where.sessionToken = sessionToken;
    if (eventName) where.eventName = eventName;

    const subscriptions = await db.sSESubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return new Response(
      JSON.stringify({
        subscriptions,
        total: subscriptions.length,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
