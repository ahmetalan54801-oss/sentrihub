import { useEffect, useRef, useState } from "react";
import { subscribeLiveEvents } from "../api/liveEvents";
import SeverityBadge from "../components/SeverityBadge";

const CAMERA_SLOTS = ["Giris Kapisi", "Sunucu Odasi", "Otopark", "Koridor"];

export default function LiveMonitor() {
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    unsubRef.current = subscribeLiveEvents((event) => {
      if (event.type === "connected") {
        setConnected(true);
        return;
      }
      setFeed((prev) => [{ ...event, id: Date.now() + Math.random() }, ...prev].slice(0, 100));
    });
    return () => unsubRef.current?.();
  }, []);

  return (
    <div>
      <h2>
        Canli Izleme{" "}
        <span className="badge" style={{ background: connected ? "#16a34a" : "#6b7280" }}>
          {connected ? "baglandi" : "baglaniyor..."}
        </span>
      </h2>

      <h3>Kamera Goruntuleri</h3>
      <p className="muted">
        Henuz bagli bir kamera yok. Bir IP kamera (RTSP/ONVIF) veya webcam eklendiginde bu
        alanlar canli goruntuyle degistirilecek.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {CAMERA_SLOTS.map((name) => (
          <div
            key={name}
            className="card"
            style={{
              aspectRatio: "16/9",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>📷</span>
            <span className="muted">{name}</span>
            <span className="muted" style={{ fontSize: 11 }}>
              kamera bagli degil
            </span>
          </div>
        ))}
      </div>

      <h3>Canli Olay Akisi</h3>
      <p className="muted">
        Harici SIEM/syslog/IDS sistemleri <code>POST /api/events</code> ile buraya olay
        gonderdikce, asagidaki liste aninda guncellenir (sayfa yenilemeye gerek yok).
      </p>
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
              <td>{e.created_at ? new Date(e.created_at).toLocaleTimeString() : "-"}</td>
            </tr>
          ))}
          {feed.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Henuz canli olay gelmedi.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
