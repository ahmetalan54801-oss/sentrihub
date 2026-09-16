import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { subscribeLiveEvents } from "../api/liveEvents";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";

export default function AlertsQueue() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function load() {
    const params = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;
    api.listAlerts(params).then(setAlerts).catch((e) => setError(e.message));
  }

  useEffect(load, [status, severity]);

  useEffect(() => {
    const unsubscribe = subscribeLiveEvents((event) => {
      if (event.type !== "connected") load();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, severity]);

  return (
    <div>
      <h2>Triage Kuyrugu</h2>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tum Durumlar</option>
          <option value="new">new</option>
          <option value="in_progress">in_progress</option>
          <option value="escalated">escalated</option>
          <option value="closed">closed</option>
          <option value="false_positive">false_positive</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Tum Onem Dereceleri</option>
          <option value="critical">critical</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
          <option value="info">info</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Baslik</th>
            <th>Host</th>
            <th>Onem</th>
            <th>Durum</th>
            <th>Atanan</th>
            <th>Bulgu Sayisi</th>
            <th>Guncellendi</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} className="clickable" onClick={() => navigate(`/alerts/${a.id}`)}>
              <td>{a.title}</td>
              <td>{a.host}</td>
              <td><SeverityBadge severity={a.severity} /></td>
              <td><StatusBadge status={a.status} /></td>
              <td>{a.assigned_to || <span className="muted">atanmadi</span>}</td>
              <td>{a.findings.length}</td>
              <td>{new Date(a.updated_at).toLocaleString()}</td>
            </tr>
          ))}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">Alert bulunamadi.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
