import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { subscribeLiveEvents } from "../api/liveEvents";
import SeverityBadge from "../components/SeverityBadge";

function findingToLogRow(f) {
  return {
    id: `finding-${f.id}`,
    source: f.source_tool,
    host: f.host,
    title: f.title,
    severity: f.severity,
    created_at: f.last_seen,
  };
}

export default function LiveMonitor() {
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    api
      .listFindings({ limit: 100 })
      .then((findings) => setFeed(findings.map(findingToLogRow)))
      .catch((e) => setError(e.message));

    unsubRef.current = subscribeLiveEvents((event) => {
      if (event.type === "connected") {
        setConnected(true);
        return;
      }
      setFeed((prev) => [{ ...event, id: `live-${Date.now()}-${Math.random()}` }, ...prev].slice(0, 200));
    });
    return () => unsubRef.current?.();
  }, []);

  return (
    <div>
      <h2>
        Canli Log Akisi{" "}
        <span className="badge" style={{ background: connected ? "#16a34a" : "#6b7280" }}>
          {connected ? "baglandi" : "baglaniyor..."}
        </span>
      </h2>
      <p className="muted">
        Gecmis bulgular (veritabanindan) ve harici SIEM/syslog/IDS sistemlerinden{" "}
        <code>POST /api/events</code> ile gelen canli olaylar tek bir akiste birlesir. Yeni
        olaylar sayfa yenilenmeden en usttte belirir.
      </p>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Kaynak</th>
            <th>Host</th>
            <th>Baslik</th>
            <th>Onem</th>
            <th>Zaman</th>
          </tr>
        </thead>
        <tbody>
          {feed.map((e) => (
            <tr key={e.id}>
              <td>{e.source ?? e.type}</td>
              <td>{e.host ?? "-"}</td>
              <td>{e.title ?? JSON.stringify(e)}</td>
              <td>{e.severity ? <SeverityBadge severity={e.severity} /> : "-"}</td>
              <td>{e.created_at ? new Date(e.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
          {feed.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Henuz kayit yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
