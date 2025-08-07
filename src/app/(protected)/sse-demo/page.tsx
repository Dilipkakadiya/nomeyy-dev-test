"use client";
import { useEffect, useRef, useState } from "react";

type EventData = {
  event: string;
  data: string;
  receivedAt: string;
};

export default function SSEDemoPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [connected, setConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [newSubscription, setNewSubscription] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Keep track of event listeners
  const eventListenersRef = useRef<Record<string, (e: MessageEvent) => void>>(
    {},
  );

  // Add event listener for a custom event
  function addEventListenerForEvent(eventName: string) {
    if (eventListenersRef.current[eventName]) return;
    const handler = (e: MessageEvent) => {
      setEvents((prev) => [
        {
          event: eventName,
          data: e.data,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      saveEventToDB(eventName, e.data);
    };
    eventSourceRef.current?.addEventListener(eventName, handler);
    eventListenersRef.current[eventName] = handler;
  }

  // Remove event listener for a custom event
  function removeEventListenerForEvent(eventName: string) {
    const handler = eventListenersRef.current[eventName];
    if (handler) {
      eventSourceRef.current?.removeEventListener(eventName, handler);
      delete eventListenersRef.current[eventName];
    }
  }

  // When subscriptions change, update event listeners
  useEffect(() => {
    subscriptions.forEach((eventName) => addEventListenerForEvent(eventName));
    // Remove listeners for events no longer subscribed
    Object.keys(eventListenersRef.current).forEach((eventName) => {
      if (!subscriptions.includes(eventName)) {
        removeEventListenerForEvent(eventName);
      }
    });
    // Cleanup on unmount
    return () => {
      Object.keys(eventListenersRef.current).forEach((eventName) => {
        removeEventListenerForEvent(eventName);
      });
    };
  }, [subscriptions]);

  useEffect(() => {
    // Connect to SSE endpoint
    const es = new EventSource(`/api/sse`);
    eventSourceRef.current = es;
    setConnected(true);

    es.onopen = () => {
      setConnected(true);
      console.log("[SSE] Connection opened");
    };

    es.onmessage = (e) => {
      // Default event
      console.log("[SSE] message event:", e.data);
      setEvents((prev) => [
        {
          event: "message",
          data: e.data,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      saveEventToDB("message", e.data);
    };

    es.addEventListener("notification", (e: MessageEvent) => {
      console.log("[SSE] notification event:", e.data);
      setEvents((prev) => [
        {
          event: "notification",
          data: e.data,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      saveEventToDB("notification", e.data);
    });

    es.addEventListener("ping", (e: MessageEvent) => {
      console.log("[SSE] ping received");
      // Update connection status
      setConnected(true);
    });

    // Add listener for custom events
    es.addEventListener("demo-event", (e: MessageEvent) => {
      console.log("[SSE] demo-event received:", e.data);
      setEvents((prev) => [
        {
          event: "demo-event",
          data: e.data,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      saveEventToDB("demo-event", e.data);
    });

    es.addEventListener("test-event", (e: MessageEvent) => {
      console.log("[SSE] test-event received:", e.data);
      setEvents((prev) => [
        {
          event: "test-event",
          data: e.data,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      saveEventToDB("test-event", e.data);
    });

    es.onerror = (err) => {
      setConnected(false);
      console.error("[SSE] Connection error:", err);
      es.close();
    };

    // EventSource doesn't have onclose, we handle disconnection in onerror
    // and cleanup in the return function

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  // Save event to DB via API route
  async function saveEventToDB(event: string, data: any) {
    try {
      await fetch("/api/sse/save-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data }),
      });
    } catch (err) {
      console.error("Error saving event:", err);
    }
  }

  // Subscribe to an event
  async function subscribeToEvent(eventName: string) {
    if (!eventName.trim()) return;

    try {
      const res = await fetch("/api/sse/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: eventName.trim(),
        }),
      });

      if (res.ok) {
        setSubscriptions((prev) => [...prev, eventName.trim()]);
        setNewSubscription("");
        console.log(`Subscribed to event: ${eventName}`);
      } else {
        console.error("Failed to subscribe to event");
      }
    } catch (err) {
      console.error("Error subscribing to event:", err);
    }
  }

  // Unsubscribe from an event
  async function unsubscribeFromEvent(eventName: string) {
    try {
      const res = await fetch("/api/sse/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName,
        }),
      });

      if (res.ok) {
        setSubscriptions((prev) => prev.filter((sub) => sub !== eventName));
        console.log(`Unsubscribed from event: ${eventName}`);
      } else {
        console.error("Failed to unsubscribe from event");
      }
    } catch (err) {
      console.error("Error unsubscribing from event:", err);
    }
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "2rem auto",
        padding: 32,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 12px #0001",
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 16,
          color: "#1e293b",
          letterSpacing: -1,
        }}
      >
        SSE Demo Page
      </h1>

      {/* Connection Status */}
      <div
        style={{
          padding: 16,
          background: connected ? "#f0fdf4" : "#fef2f2",
          borderRadius: 8,
          border: `1px solid ${connected ? "#22c55e" : "#ef4444"}`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: connected ? "#22c55e" : "#ef4444",
          }}
        >
          Status: {connected ? "Connected" : "Disconnected"}
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Session: {connected ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Subscription Management */}
      <div
        style={{
          background: "#f8fafc",
          padding: 20,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16,
            color: "#1e293b",
          }}
        >
          Event Subscriptions
        </h3>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            value={newSubscription}
            onChange={(e) => setNewSubscription(e.target.value)}
            placeholder="Enter event name to subscribe"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              color: "#000",
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                subscribeToEvent(newSubscription);
              }
            }}
          />
          <button
            onClick={() => subscribeToEvent(newSubscription)}
            disabled={!newSubscription.trim()}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              background: "#2563eb",
              color: "#fff",
              border: 0,
              fontWeight: 600,
              cursor: newSubscription.trim() ? "pointer" : "not-allowed",
              opacity: newSubscription.trim() ? 1 : 0.6,
            }}
          >
            Subscribe
          </button>
        </div>

        {subscriptions.length > 0 && (
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "#374151",
              }}
            >
              Current Subscriptions:
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {subscriptions.map((sub) => (
                <div
                  key={sub}
                  style={{
                    padding: "6px 12px",
                    background: "#e0e7ff",
                    color: "#3730a3",
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {sub}
                  <button
                    onClick={() => unsubscribeFromEvent(sub)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Events Display */}
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 16,
            color: "#334155",
          }}
        >
          Received Events
        </h2>
        <div
          style={{
            maxHeight: 400,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          {events.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
              No events received yet. Try subscribing to some events or wait for
              broadcasts.
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #f3f4f6",
                  background: index % 2 === 0 ? "#fafbfc" : "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      background: "#dbeafe",
                      color: "#1e40af",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {event.event}
                  </span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#374151",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {typeof event.data === "string"
                    ? event.data
                    : JSON.stringify(event.data, null, 2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#888", marginTop: 24 }}>
        This page demonstrates SSE functionality. Open the admin page to send
        events.
      </div>
    </div>
  );
}
