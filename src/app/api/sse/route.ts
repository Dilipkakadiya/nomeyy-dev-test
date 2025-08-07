import { sseManager } from "@/lib/sse-server";
import { nanoid } from "nanoid";

type StreamRes = {
  write: (chunk: string) => boolean;
  end: () => boolean;
};

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

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const sessionToken =
    getCookieValue(cookieHeader, "authjs.session-token") ??
    getCookieValue(cookieHeader, "__Secure-authjs.session-token") ??
    getCookieValue(cookieHeader, "__Host-authjs.session-token");

  const clientId = sessionToken ?? nanoid();
  await sseManager.unsubscribeFromAllEvents(sessionToken);
  // Get user agent and IP address for session tracking
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0] ?? realIp ?? "unknown";

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Write initial comment to establish connection
  void writer.write(new TextEncoder().encode(":ok\n\n"));

  // Register client
  const streamRes: StreamRes = {
    write: (chunk: string) => {
      void writer.write(new TextEncoder().encode(chunk));
      return true;
    },
    end: () => {
      void writer.close();
      return true;
    },
  };

  const client = {
    id: clientId,
    res: streamRes,
    sessionToken: sessionToken ?? undefined,
    lastPing: Date.now(),
    userAgent,
    ipAddress,
  };

  await sseManager.addClient(client);

  // Cleanup when the stream is closed (client disconnects)
  void writer.closed.then(() => {
    void sseManager.removeClient(clientId);
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Usage:
 * - Client connects via GET /api/sse (session token from cookies)
 * - Server can push events using sseManager.sendEventToClient, sendEventToUser, or broadcast
 * - Heartbeat/ping is automatic
 */
