import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split("=");
    if (cookieName === name) {
      return cookieValue ?? null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { event, data } = await req.json();
    const cookieHeader = req.headers.get("cookie");
    const sessionToken =
      getCookieValue(cookieHeader, "authjs.session-token") ??
      getCookieValue(cookieHeader, "__Secure-authjs.session-token") ??
      getCookieValue(cookieHeader, "__Host-authjs.session-token");
    console.info("[SSE] Saving event to DB:", { event, data, sessionToken });
    await db.sSEEvent.create({
      data: {
        event,
        payload: typeof data === "string" ? JSON.parse(data) : data,
        sessionToken,
      },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[SSE] Error saving event to DB:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
