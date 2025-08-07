import { sseManager } from "../features/shared/utils/sse-manager";

// Server-only SSE utilities
export { sseManager } from "../features/shared/utils/sse-manager";
export type { SSEEvent, SSEClient } from "../features/shared/utils/sse-manager";

// Re-export utility functions for server-side use
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
