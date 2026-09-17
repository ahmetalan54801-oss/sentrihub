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

function buildTimeBuckets(feed, bucketMinutes = 1, bucketCount = 15) {
  const bucketMs = bucketMinutes * 60000;
  const now = Date.now();
  const start0 = now - (bucketCount - 1) * bucketMs;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: start0 + i * bucketMs,
    count: 0,
  }));
  for (const e of feed) {
    if (!e.created_at) continue;
    const t = new Date(e.created_at).getTime();
    const idx = Math.floor((t - start0) / bucketMs);
    if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
  }
  return buckets;
}

function TimeSeriesChart({ buckets }) {
  const width = 720;
  const height = 140;
  const padX = 12;
  const padY = 20;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = (width - padX * 2) / Math.max(1, buckets.length - 1);
  const points = buckets.map((b, i) => ({
    x: padX + i * stepX,
    y: height - padY - (b.count / max) * (height - padY * 2),
    count: b.count,
    start: b.start,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${height - padY} L ${points[0].x.toFixed(1)} ${height - padY} Z`;
  // Label the extreme (peak), not always the endpoint - a trailing bucket can
  // lag "now" by a few seconds and read 0 even when a visible spike sits next to it.
  const peak = points.reduce((best, p) => (p.count > best.count ? p : best), points[0]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        stroke="#2c2c2a"
        strokeWidth="1"
      />
      <path d={areaPath} fill="#3987e5" opacity="0.12" stroke="none" />
      <path d={linePath} fill="none" stroke="#3987e5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="9" fill="transparent">
          <title>
            {new Date(p.start).toLocaleTimeString()} - {p.count} olay
          </title>
        </circle>
      ))}
      <circle cx={last.x} cy={last.y} r="4" fill="#3987e5" opacity={last === peak ? 0 : 0.6} />
      {peak.count > 0 && (
        <>
          <circle cx={peak.x} cy={peak.y} r="6" fill="#0b0f14" />
          <circle cx={peak.x} cy={peak.y} r="4" fill="#3987e5" />
          <text
            x={peak.x}
            y={peak.y - 12}
            fill="#e6edf3"
            fontSize="13"
            textAnchor={peak.x > width - 40 ? "end" : "middle"}
          >
            {peak.count}
          </text>
        </>
      )}
    </svg>
  );
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

  const timeBuckets = useMemo(() => buildTimeBuckets(feed), [feed]);

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

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Zaman Icinde Olay Hacmi (son 15 dakika)</h3>
        <TimeSeriesChart buckets={timeBuckets} />
      </div>

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
