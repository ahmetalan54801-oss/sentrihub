import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";

const STATUSES = ["new", "in_progress", "escalated", "closed", "false_positive"];

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [assignee, setAssignee] = useState("");

  function load() {
    api
      .getAlert(id)
      .then((a) => {
        setAlert(a);
        setAssignee(a.assigned_to || "");
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function changeStatus(status) {
    try {
      await api.updateAlert(id, { status });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveAssignee() {
    try {
      await api.updateAlert(id, { assigned_to: assignee });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    try {
      await api.addNote(id, { author: noteAuthor || "analist", body: noteBody });
      setNoteBody("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!alert) return <p className="muted">Yukleniyor...</p>;

  return (
    <div>
      <button className="secondary" onClick={() => navigate("/alerts")}>
        &larr; Kuyruga don
      </button>

      <h2>{alert.title}</h2>

      <div className="detail-box">
        <p>
          <strong>Host:</strong> {alert.host} &nbsp;
          <SeverityBadge severity={alert.severity} /> &nbsp;
          <StatusBadge status={alert.status} />
        </p>

        <div className="filters">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={s === alert.status ? "" : "secondary"}
              onClick={() => changeStatus(s)}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="filters" style={{ marginTop: 12 }}>
          <input
            placeholder="Atanan analist"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
          <button className="secondary" onClick={saveAssignee}>
            Kaydet
          </button>
        </div>
      </div>

      <h3>Iliskili Bulgular ({alert.findings.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Kaynak</th>
            <th>Baslik</th>
            <th>Port</th>
            <th>CVE</th>
            <th>CVSS</th>
            <th>Onem</th>
          </tr>
        </thead>
        <tbody>
          {alert.findings.map((f) => (
            <tr key={f.id}>
              <td>{f.source_tool}</td>
              <td>{f.title}</td>
              <td>{f.port || "-"}</td>
              <td>{f.cve || "-"}</td>
              <td>{f.cvss_score ?? "-"}</td>
              <td><SeverityBadge severity={f.severity} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Analist Notlari</h3>
      <div className="notes-list">
        {alert.notes.map((n) => (
          <div className="note" key={n.id}>
            <div className="meta">
              {n.author || "anonim"} - {new Date(n.created_at).toLocaleString()}
            </div>
            {n.body}
          </div>
        ))}
        {alert.notes.length === 0 && <p className="muted">Henuz not yok.</p>}
      </div>

      <form className="upload-form" onSubmit={submitNote}>
        <input
          placeholder="Analist adi (opsiyonel)"
          value={noteAuthor}
          onChange={(e) => setNoteAuthor(e.target.value)}
        />
        <textarea
          placeholder="Not ekle..."
          rows={3}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
        />
        <button type="submit">Not Ekle</button>
      </form>
    </div>
  );
}
