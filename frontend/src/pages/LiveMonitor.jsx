import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { subscribeLiveEvents } from "../api/liveEvents";
import SeverityBadge from "../components/SeverityBadge";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

// Dark-mode categorical slots, fixed order (see dataviz skill palette).
const CATEGORICAL_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#9085e9", // violet
];
const OTHER_COLOR = "#6b7280";

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

function HorizontalBarChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 36px",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span className="muted" style={{ fontSize: 13, textAlign: "right" }}>
            {r.label}
          </span>
          <div style={{ background: "#0f1520", borderRadius: 4, height: 20, position: "relative" }}>
            {r.value > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(r.value / max) * 100}%`,
                  minWidth: 4,
                  background: r.color,
                  borderRadius: 4,
                }}
              />
            )}
          </div>
          <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
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

  const severityRows = useMemo(() => {
    const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
    for (const e of feed) {
      if (e.severity && counts[e.severity] !== undefined) counts[e.severity] += 1;
    }
    return SEVERITY_ORDER.map((s) => ({
      label: s,
      value: counts[s],
      color: `var(--sev-${s})`,
    }));
  }, [feed]);

  const sourceRows = useMemo(() => {
    const counts = {};
    for (const e of feed) {
      const key = e.source ?? e.type ?? "diger";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6).map(([label, value], i) => ({
      label,
      value,
      color: CATEGORICAL_COLORS[i],
    }));
    const restTotal = sorted.slice(6).reduce((sum, [, v]) => sum + v, 0);
    if (restTotal > 0) top.push({ label: "diger", value: restTotal, color: OTHER_COLOR });
    return top;
  }, [feed]);

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
        <code>POST /api/events</code> ile gelen canli olaylar tek bir akiste birlesir. Grafikler
        ve tablo yeni olay geldiginde aninda guncellenir.
      </p>

      {error && <p className="error">{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Onem Derecesine Gore Dagilim</h3>
          <HorizontalBarChart rows={severityRows} />
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kaynaga Gore Olay Sayisi</h3>
          {sourceRows.length > 0 ? (
            <HorizontalBarChart rows={sourceRows} />
          ) : (
            <p className="muted">Henuz veri yok.</p>
          )}
        </div>
      </div>

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
