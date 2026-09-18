import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function IncidentReports() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.listIncidents().then(setReports).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h2>Olay Raporlari</h2>
      <p className="muted">
        Triage kuyrugundaki bir alert'in detay sayfasindan olusturulan mudahale/rapor kayitlari.
      </p>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Baslik</th>
            <th>Yazan</th>
            <th>Olusturuldu</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr
              key={r.id}
              className="clickable"
              onClick={() => navigate(`/alerts/${r.alert_id}`)}
            >
              <td>{r.title}</td>
              <td>{r.author || <span className="muted">bilinmiyor</span>}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Henuz rapor yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
