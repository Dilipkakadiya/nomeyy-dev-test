import { unsubscribeFromEvent } from "@/lib/sse-server";
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
    const { eventName, clientId } = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ ok: false, error: "eventName is required" }),
        { status: 400 },
      );
    }

    // Get session token from cookies
    const cookieHeader = req.headers.get("cookie");
    const sessionToken =
      getCookieValue(cookieHeader, "authjs.session-token") ??
      getCookieValue(cookieHeader, "__Secure-authjs.session-token") ??
      getCookieValue(cookieHeader, "__Host-authjs.session-token");

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "No session token found" }),
        { status: 401 },
      );
    }

    await unsubscribeFromEvent(sessionToken, eventName, clientId);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
