import { useEffect, useState } from "react";
import { api } from "../api/client";
import { subscribeLiveEvents } from "../api/liveEvents";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api.summary().then(setSummary).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const unsubscribe = subscribeLiveEvents((event) => {
      if (event.type !== "connected") load();
    });
    return unsubscribe;
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="muted">Yukleniyor...</p>;

  return (
    <div>
      <h2>Genel Durum</h2>
      <div className="cards">
        <div className="card">
          <div className="value">{summary.total_findings}</div>
          <div className="label">Toplam Bulgu</div>
        </div>
        <div className="card">
          <div className="value">{summary.total_alerts}</div>
          <div className="label">Toplam Alert</div>
        </div>
        <div className="card">
          <div className="value">{summary.open_alerts}</div>
          <div className="label">Acik Alert</div>
        </div>
      </div>

      <h3>Onem Derecesine Gore Bulgular</h3>
      <div className="cards">
        {SEVERITY_ORDER.map((sev) => (
          <div className="card" key={sev}>
            <div className="value">{summary.severity_breakdown[sev] || 0}</div>
            <div className="label">{sev}</div>
          </div>
        ))}
      </div>

      <h3>Alert Durum Dagilimi</h3>
      <div className="cards">
        {Object.entries(summary.alert_status_breakdown).map(([status, count]) => (
          <div className="card" key={status}>
            <div className="value">{count}</div>
            <div className="label">{status.replace("_", " ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
