import { sseManager } from "@/lib/sse-server";
import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Get all active clients from memory
    const clientsArr = Array.from((sseManager as any).clients.values());

    // Get all sessions from database
    const sessions = await db.sSESession.findMany({
      orderBy: { lastSeen: "desc" },
    });

    // Find all session tokens for username lookup
    const sessionTokens = clientsArr
      .map((c) => c.sessionToken)
      .filter((token) => typeof token === "string" && token.length > 10);

    // Query usernames for all session tokens
    let sessionUsers: Record<string, { username: string | null }> = {};
    if (sessionTokens.length > 0) {
      const authSessions = await db.session.findMany({
        where: { sessionToken: { in: sessionTokens } },
        include: { user: true },
      });
      sessionUsers = Object.fromEntries(
        authSessions.map((s) => [
          s.sessionToken,
          { username: s.user?.name ?? s.user?.email ?? null },
        ]),
      );
    }

    // Build response with both active clients and session history
    const activeClients = clientsArr.map((c) => ({
      clientId: c.id,
      sessionToken: c.sessionToken,
      username: sessionUsers[c.sessionToken]?.username ?? null,
      lastPing: c.lastPing,
      status: "online",
      userAgent: c.userAgent,
      ipAddress: c.ipAddress,
      subscriptions: c.subscriptions || [],
    }));

    const sessionHistory = sessions.map((s) => ({
      clientId: s.clientId,
      sessionToken: s.sessionToken,
      username: s.username,
      lastPing: s.lastPing.getTime(),
      lastSeen: s.lastSeen.getTime(),
      status: s.status,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.getTime(),
    }));

    return new Response(
      JSON.stringify({
        activeClients,
        sessionHistory,
        totalActive: activeClients.length,
        totalSessions: sessions.length,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
