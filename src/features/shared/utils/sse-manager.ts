import type { NextApiResponse } from "next";
import { db } from "@/lib/db";

/**
 * Server-Sent Events (SSE) Manager
 * --------------------------------
 * This module provides a reusable, centralized SSE manager for real-time server-to-client notifications.
 *
 * Features:
 * - Tracks active client connections (optionally per user/session)
 * - Sends named events with JSON payloads to specific clients, users, or broadcasts to all
 * - Handles client connection lifecycle (connect, disconnect, errors)
 * - Provides utility functions for backend modules to push updates without managing SSE protocol details
 * - Heartbeat/ping mechanism to keep connections alive
 * - Cleans up client connections on disconnect or error
 * - Includes error handling and logging
 * - Subscription system for specific events
 * - Enhanced session tracking with offline detection
 *
 * Usage:
 * ------
 * 1. Clients connect to the SSE endpoint (e.g., /api/sse) via GET request:
 *    fetch('/api/sse', { headers: { 'Accept': 'text/event-stream' } })
 *
 * 2. Backend modules can send events:
 *    import { sendSSEToUser, broadcastSSE } from '@/features/shared/utils';
 *    sendSSEToUser('sessionToken', 'notification', { message: 'Hello!' });
 *    broadcastSSE('system-update', { version: '1.2.3' });
 *
 * 3. See /api/sse.ts for endpoint implementation and connection details.
 *
 * 4. Utility functions:
 *    - sendSSEToClient(clientId, event, data)
 *    - sendSSEToUser(sessionToken, event, data)
 *    - broadcastSSE(event, data)
 *    - subscribeToEvent(sessionToken, eventName, clientId?)
 *    - unsubscribeFromEvent(sessionToken, eventName, clientId?)
 *
 * 5. The SSEManager is a singleton and can be imported anywhere in the backend.
 *
 * Integration points:
 * ------------------
 * - Webhook handlers, job processors, or any backend logic can push events using the provided utility functions.
 * - No need to manage raw SSE protocol details or connection state.
 */
export type SSEStreamRes = {
  write: (chunk: string) => boolean;
  end: () => boolean;
};

export type SSEClient = {
  id: string;
  res: NextApiResponse | SSEStreamRes;
  sessionToken?: string;
  lastPing: number;
  subscriptions?: string[];
  userAgent?: string;
  ipAddress?: string;
};

function isStreamRes(res: NextApiResponse | SSEStreamRes): res is SSEStreamRes {
  return (
    typeof (res as SSEStreamRes).write === "function" &&
    typeof (res as SSEStreamRes).end === "function" &&
    !("statusCode" in res)
  );
}

export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_MS = 25000;
  private readonly SESSION_CLEANUP_MS = 60000; // 1 minute

  constructor() {
    this.startHeartbeat();
    this.startSessionCleanup();
  }

  async addClient(client: SSEClient) {
    // Remove any previous client with the same sessionToken
    if (client.sessionToken) {
      for (const [id, c] of this.clients.entries()) {
        if (c.sessionToken === client.sessionToken) {
          await this.removeClient(id);
        }
      }
    }

    this.clients.set(client.id, client);

    // Create or update session in database
    await this.updateSession(client);

    this.log(
      `Client connected: ${client.id} (Session: ${client.sessionToken || "anonymous"})`,
    );
  }

  async removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        if (isStreamRes(client.res)) {
          client.res.end();
        } else {
          client.res.end();
        }
      } catch (err) {
        this.log(`Error ending response for client ${clientId}: ${err}`);
      }
      // Mark all sessions for this sessionToken as offline
      if (client.sessionToken) {
        await this.markSessionOfflineBySessionToken(client.sessionToken);
      } else {
        await this.markSessionOffline(clientId);
      }
      this.clients.delete(clientId);
      this.log(`Client disconnected: ${clientId}`);
    }
  }

  sendEventToClient(clientId: string, event: SSEEvent) {
    const client = this.clients.get(clientId);
    if (client) {
      this.send(client.res, event);
    }
  }

  async sendEventToUser(sessionToken: string, event: SSEEvent) {
    for (const client of this.clients.values()) {
      if (client.sessionToken === sessionToken) {
        this.send(client.res, event);
      }
    }
  }

  async sendEventToSubscribers(eventName: string, event: SSEEvent) {
    // Get all subscriptions for this event
    const subscriptions = await db.sSESubscription.findMany({
      where: { eventName },
    });

    // Send to all subscribed clients
    for (const subscription of subscriptions) {
      if (subscription.clientId) {
        // Send to specific client
        this.sendEventToClient(subscription.clientId, event);
      } else {
        // Send to all clients of this session
        await this.sendEventToUser(subscription.sessionToken, event);
      }
    }
  }

  broadcast(event: SSEEvent) {
    for (const client of this.clients.values()) {
      this.send(client.res, event);
    }
  }

  async subscribeToEvent(
    sessionToken: string,
    eventName: string,
    clientId?: string,
  ) {
    try {
      await db.sSESubscription.upsert({
        where: {
          sessionToken_eventName_clientId: {
            sessionToken,
            eventName,
            clientId: sessionToken,
          },
        },
        update: {},
        create: {
          sessionToken,
          eventName,
          clientId: sessionToken,
        },
      });
      // Update all in-memory clients for this session
      for (const client of this.clients.values()) {
        if (client.sessionToken === sessionToken) {
          if (!client.subscriptions) client.subscriptions = [];
          if (!client.subscriptions.includes(eventName)) {
            client.subscriptions.push(eventName);
          }
        }
      }
      this.log(`Session ${sessionToken} subscribed to event: ${eventName}`);
    } catch (err) {
      this.log(`Error subscribing to event: ${err}`);
    }
  }

  async unsubscribeFromEvent(
    sessionToken: string,
    eventName: string,
    clientId?: string,
  ) {
    try {
      await db.sSESubscription.deleteMany({
        where: {
          sessionToken,
          eventName,
        },
      });
      // Update all in-memory clients for this session
      for (const client of this.clients.values()) {
        if (client.sessionToken === sessionToken && client.subscriptions) {
          client.subscriptions = client.subscriptions.filter(
            (sub) => sub !== eventName,
          );
        }
      }
      this.log(`Session ${sessionToken} unsubscribed from event: ${eventName}`);
    } catch (err) {
      this.log(`Error unsubscribing from event: ${err}`);
    }
  }
  async unsubscribeFromAllEvents(sessionToken: string) {
    try {
      await db.sSESubscription.deleteMany({
        where: {
          sessionToken,
        },
      });
      // Update all in-memory clients for this session
      for (const client of this.clients.values()) {
        if (client.sessionToken === sessionToken && client.subscriptions) {
          client.subscriptions = [];
        }
      }
      this.log(`Session ${sessionToken} unsubscribed from event: ${eventName}`);
    } catch (err) {
      this.log(`Error unsubscribing from event: ${err}`);
    }
  }

  private async send(res: NextApiResponse | SSEStreamRes, event: SSEEvent) {
    try {
      const data = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
      if (isStreamRes(res)) {
        const result = res.write(data);
        if (result instanceof Promise) {
          await result;
        }
        this.log(`Sent event '${event.event}' to stream client`);
      } else {
        res.write(data);
        this.log(`Sent event '${event.event}' to Node client`);
      }
    } catch (err) {
      this.log(`Error sending event to client: ${err}`);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      for (const [id, client] of this.clients.entries()) {
        try {
          const data = `event: ping\ndata: {}\n\n`;
          if (isStreamRes(client.res)) {
            client.res.write(data);
          } else {
            client.res.write(data);
          }
          client.lastPing = now;

          // Update session ping time
          await this.updateSessionPing(id);
        } catch (err) {
          this.log(`Error pinging client ${id}: ${err}`);
          await this.removeClient(id);
        }
      }
    }, this.HEARTBEAT_MS);
  }

  private startSessionCleanup() {
    if (this.sessionCleanupInterval) return;
    this.sessionCleanupInterval = setInterval(async () => {
      try {
        // Mark sessions as offline if they haven't pinged in the last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        await db.sSESession.updateMany({
          where: {
            lastPing: { lt: thirtySecondsAgo },
            status: "online",
          },
          data: {
            status: "offline",
          },
        });

        // Also check for clients that haven't pinged recently
        const now = Date.now();
        const thirtySecondsAgoMs = now - 30 * 1000;
        for (const [clientId, client] of this.clients.entries()) {
          if (client.lastPing < thirtySecondsAgoMs) {
            this.log(
              `Client ${clientId} hasn't pinged recently, marking as offline`,
            );
            await this.markSessionOffline(clientId);
            this.removeClient(clientId);
          }
        }
      } catch (err) {
        this.log(`Error in session cleanup: ${err}`);
      }
    }, 10000); // Check every 10 seconds instead of 60
  }

  private async updateSession(client: SSEClient) {
    try {
      await db.sSESession.upsert({
        where: { clientId: client.id },
        update: {
          sessionToken: client.sessionToken,
          lastSeen: new Date(),
          lastPing: new Date(),
          status: "online",
          userAgent: client.userAgent,
          ipAddress: client.ipAddress,
        },
        create: {
          clientId: client.id,
          sessionToken: client.sessionToken,
          lastSeen: new Date(),
          lastPing: new Date(),
          status: "online",
          userAgent: client.userAgent,
          ipAddress: client.ipAddress,
        },
      });
    } catch (err) {
      this.log(`Error updating session: ${err}`);
    }
  }

  private async updateSessionPing(clientId: string) {
    try {
      await db.sSESession.updateMany({
        where: { clientId },
        data: {
          lastPing: new Date(),
          status: "online",
        },
      });
    } catch (err) {
      this.log(`Error updating session ping: ${err}`);
    }
  }

  private async markSessionOffline(clientId: string) {
    try {
      await db.sSESession.updateMany({
        where: { clientId },
        data: {
          status: "offline",
          lastSeen: new Date(),
        },
      });
    } catch (err) {
      this.log(`Error marking session offline: ${err}`);
    }
  }

  private async markSessionOfflineBySessionToken(sessionToken: string) {
    try {
      await db.sSESession.updateMany({
        where: { sessionToken },
        data: {
          status: "offline",
          lastSeen: new Date(),
        },
      });
    } catch (err) {
      this.log(`Error marking session offline by sessionToken: ${err}`);
    }
  }

  private log(msg: string) {
    // Replace with your logger if needed
    console.info(`[SSEManager] ${msg}`);
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
    for (const client of this.clients.values()) {
      try {
        if (isStreamRes(client.res)) {
          client.res.end();
        } else {
          client.res.end();
        }
      } catch (err) {
        this.log(`Error ending response for client ${client.id}: ${err}`);
      }
    }
    this.clients.clear();
    this.log("SSEManager cleaned up all clients and intervals.");
  }
}

export const sseManager = new SSEManager();

export type SSEEvent = {
  event: string;
  data: any;
};

/**
 * Utility functions for backend modules to send SSE events.
 * Usage examples:
 *   sendSSEToUser('sessionToken', 'eventName', { foo: 'bar' })
 *   broadcastSSE('eventName', { foo: 'bar' })
 *   subscribeToEvent('sessionToken', 'eventName', 'clientId')
 */
export function sendSSEToClient(clientId: string, event: string, data: any) {
  sseManager.sendEventToClient(clientId, { event, data });
}

export function sendSSEToUser(sessionToken: string, event: string, data: any) {
  sseManager.sendEventToUser(sessionToken, { event, data });
}

export function broadcastSSE(event: string, data: any) {
  sseManager.broadcast({ event, data });
}

export function sendSSEToSubscribers(
  eventName: string,
  event: string,
  data: any,
) {
  sseManager.sendEventToSubscribers(eventName, { event, data });
}

export function subscribeToEvent(
  sessionToken: string,
  eventName: string,
  clientId?: string,
) {
  sseManager.subscribeToEvent(sessionToken, eventName, clientId);
}

export function unsubscribeFromEvent(
  sessionToken: string,
  eventName: string,
  clientId?: string,
) {
  sseManager.unsubscribeFromEvent(sessionToken, eventName, clientId);
}
