"use client";
import { useEffect, useState } from "react";

type Client = {
  clientId: string;
  sessionToken?: string;
  username?: string | null;
  lastPing: number;
  status: string;
  userAgent?: string;
  ipAddress?: string;
  subscriptions?: string[];
};

type Session = {
  clientId: string;
  sessionToken?: string;
  username?: string | null;
  lastPing: number;
  lastSeen: number;
  status: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: number;
};

type Subscription = {
  id: string;
  sessionToken: string;
  eventName: string;
  clientId?: string;
  createdAt: string;
};

type ClientsResponse = {
  activeClients: Client[];
  sessionHistory: Session[];
  totalActive: number;
  totalSessions: number;
};

export default function SSEAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [event, setEvent] = useState("demo-event");
  const [payload, setPayload] = useState('{"message":"Hello!"}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "clients" | "sessions" | "subscriptions"
  >("clients");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      // Fetch clients and sessions
      const clientsRes = await fetch("/api/sse/clients");
      const clientsData: ClientsResponse = await clientsRes.json();
      setClients(clientsData.activeClients);
      setSessions(clientsData.sessionHistory);

      // Fetch subscriptions
      const subsRes = await fetch("/api/sse/subscriptions");
      const subsData = await subsRes.json();
      setSubscriptions(subsData.subscriptions);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }

  function toggleSelect(clientId: string) {
    setSelected((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  }

  async function sendEvent() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sse/send-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: selected,
          event,
          payload: JSON.parse(payload),
        }),
      });
      const data = await res.json();
      setResult(data.ok ? "Event sent!" : `Error: ${data.error}`);
    } catch (err) {
      setResult("Error sending event");
    }
    setLoading(false);
  }

  async function sendToSubscribers() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sse/send-to-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: event,
          event,
          payload: JSON.parse(payload),
        }),
      });
      const data = await res.json();
      setResult(
        data.ok ? "Event sent to subscribers!" : `Error: ${data.error}`,
      );
    } catch (err) {
      setResult("Error sending event to subscribers");
    }
    setLoading(false);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "online":
        return "#059669";
      case "offline":
        return "#dc2626";
      case "away":
        return "#d97706";
      default:
        return "#6b7280";
    }
  }

  // Merge subscriptions for each client
  const clientSubscriptionsMap: Record<string, Set<string>> = {};
  subscriptions.forEach((sub) => {
    if (!clientSubscriptionsMap[sub.clientId || sub.sessionToken]) {
      clientSubscriptionsMap[sub.clientId || sub.sessionToken] = new Set();
    }
    clientSubscriptionsMap[sub.clientId || sub.sessionToken].add(sub.eventName);
  });
  clients.forEach((c) => {
    if (!clientSubscriptionsMap[c.clientId]) {
      clientSubscriptionsMap[c.clientId] = new Set();
    }
    (c.subscriptions || []).forEach((s) =>
      clientSubscriptionsMap[c.clientId].add(s),
    );
  });

  return (
    <div
      style={{
        maxWidth: 1200,
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
        SSE Admin Dashboard
      </h1>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            padding: 16,
            background: "#f0f9ff",
            borderRadius: 8,
            border: "1px solid #0ea5e9",
            flex: 1,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0ea5e9" }}>
            {clients.length}
          </div>
          <div style={{ fontSize: 14, color: "#0369a1" }}>Active Clients</div>
        </div>
        <div
          style={{
            padding: 16,
            background: "#f0fdf4",
            borderRadius: 8,
            border: "1px solid #22c55e",
            flex: 1,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
            {sessions.length}
          </div>
          <div style={{ fontSize: 14, color: "#15803d" }}>Total Sessions</div>
        </div>
        <div
          style={{
            padding: 16,
            background: "#fef3c7",
            borderRadius: 8,
            border: "1px solid #f59e0b",
            flex: 1,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
            {subscriptions.length}
          </div>
          <div style={{ fontSize: 14, color: "#d97706" }}>Subscriptions</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <button
          onClick={() => setActiveTab("clients")}
          style={{
            padding: "12px 24px",
            background: activeTab === "clients" ? "#1e293b" : "transparent",
            color: activeTab === "clients" ? "#fff" : "#374151",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Active Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          style={{
            padding: "12px 24px",
            background: activeTab === "sessions" ? "#1e293b" : "transparent",
            color: activeTab === "sessions" ? "#fff" : "#374151",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Session History ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          style={{
            padding: "12px 24px",
            background:
              activeTab === "subscriptions" ? "#1e293b" : "transparent",
            color: activeTab === "subscriptions" ? "#fff" : "#374151",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Subscriptions ({subscriptions.length})
        </button>
      </div>

      {/* Event Sending Form */}
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
          Send Events
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendEvent();
          }}
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <label
                style={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: 15,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Event Name:
                <input
                  type="text"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  style={{
                    marginLeft: 8,
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    minWidth: 120,
                    color: "#1e293b",
                    background: "#f8fafc",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                  required
                />
              </label>
            </div>
            <div>
              <label
                style={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: 15,
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Payload (JSON):
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  style={{
                    marginLeft: 8,
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    minWidth: 220,
                    color: "#1e293b",
                    background: "#f8fafc",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                  required
                />
              </label>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="submit"
              disabled={loading || selected.length === 0}
              style={{
                padding: "10px 22px",
                borderRadius: 4,
                background: "#2563eb",
                color: "#fff",
                border: 0,
                fontWeight: 700,
                fontSize: 15,
                cursor:
                  loading || selected.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 1px 4px #2563eb22",
              }}
            >
              Send to Selected
            </button>
            <button
              type="button"
              onClick={sendToSubscribers}
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: 4,
                background: "#059669",
                color: "#fff",
                border: 0,
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 1px 4px #05966922",
              }}
            >
              Send to Subscribers
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setResult(null);
                try {
                  const res = await fetch("/api/sse/broadcast-event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event,
                      payload: JSON.parse(payload),
                    }),
                  });
                  const data = await res.json();
                  setResult(
                    data.ok ? "Broadcast sent!" : `Error: ${data.error}`,
                  );
                } catch (err) {
                  setResult("Error sending broadcast");
                }
                setLoading(false);
              }}
              disabled={loading}
              style={{
                padding: "10px 22px",
                borderRadius: 4,
                background: "#7c3aed",
                color: "#fff",
                border: 0,
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 1px 4px #7c3aed22",
              }}
            >
              Send to All
            </button>
          </div>
          {result && (
            <div
              style={{
                marginTop: 8,
                color: result.startsWith("Error") ? "#dc2626" : "#059669",
              }}
            >
              {result}
            </div>
          )}
        </form>
      </div>

      {/* Content based on active tab */}
      {activeTab === "clients" && (
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 16,
              color: "#334155",
            }}
          >
            Active Clients
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              background: "#fafbfc",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 1px 6px #0001",
              border: "1px solid #e5e7eb",
            }}
          >
            <thead style={{ background: "#1e293b" }}>
              <tr>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                ></th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Client ID
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Session Token
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Username
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Last Ping
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  IP Address
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Subscriptions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.clientId}
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <td style={{ padding: 10, color: "#222" }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.clientId)}
                      onChange={() => toggleSelect(c.clientId)}
                    />
                  </td>
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {c.clientId}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {c.sessionToken || (
                      <span style={{ color: "#888" }}>(anonymous)</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    {c.username || (
                      <span style={{ color: "#888" }}>(unknown)</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: getStatusColor(c.status) + "20",
                        color: getStatusColor(c.status),
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    {new Date(c.lastPing).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontSize: 13 }}>
                    {c.ipAddress || "unknown"}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontSize: 13 }}>
                    {Array.from(clientSubscriptionsMap[c.clientId] || []).join(
                      ", ",
                    ) || "none"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "sessions" && (
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 16,
              color: "#334155",
            }}
          >
            Session History
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              background: "#fafbfc",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 1px 6px #0001",
              border: "1px solid #e5e7eb",
            }}
          >
            <thead style={{ background: "#1e293b" }}>
              <tr>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Client ID
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Session Token
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Username
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Last Ping
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Last Seen
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  IP Address
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.clientId}
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {s.clientId}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {s.sessionToken || (
                      <span style={{ color: "#888" }}>(anonymous)</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    {s.username || (
                      <span style={{ color: "#888" }}>(unknown)</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: getStatusColor(s.status) + "20",
                        color: getStatusColor(s.status),
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    {new Date(s.lastPing).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: 10, color: "#222" }}>
                    {new Date(s.lastSeen).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontSize: 13 }}>
                    {s.ipAddress || "unknown"}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontSize: 13 }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 16,
              color: "#334155",
            }}
          >
            Event Subscriptions
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              background: "#fafbfc",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 1px 6px #0001",
              border: "1px solid #e5e7eb",
            }}
          >
            <thead style={{ background: "#1e293b" }}>
              <tr>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Session Token
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Event Name
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Client ID
                </th>
                <th
                  style={{
                    padding: 10,
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#fff",
                    background: "#1e293b",
                    borderBottom: "2px solid #334155",
                  }}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {sub.sessionToken}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontWeight: 600 }}>
                    {sub.eventName}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      color: "#222",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {sub.clientId || (
                      <span style={{ color: "#888" }}>(all clients)</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: "#222", fontSize: 13 }}>
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 12, color: "#888", marginTop: 24 }}>
        This page is unlisted. Access directly at{" "}
        <code>/ (protected) /sse-admin</code>
      </div>
    </div>
  );
}
