import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";

const STATUSES = ["new", "in_progress", "escalated", "closed", "false_positive"];

const EMPTY_REPORT = {
  title: "",
  summary: "",
  root_cause: "",
  actions_taken: "",
  resolution: "",
  recommendations: "",
};

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [assignee, setAssignee] = useState("");
  const [reports, setReports] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT);
  const [reportBusy, setReportBusy] = useState(false);

  function load() {
    api
      .getAlert(id)
      .then((a) => {
        setAlert(a);
        setAssignee(a.assigned_to || "");
      })
      .catch((e) => setError(e.message));
    api.listIncidentsForAlert(id).then(setReports).catch(() => {});
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

  async function submitReport(e) {
    e.preventDefault();
    if (!reportForm.title.trim() || !reportForm.summary.trim()) {
      setError("Baslik ve ozet zorunlu");
      return;
    }
    setReportBusy(true);
    try {
      await api.createIncident(id, reportForm);
      setReportForm(EMPTY_REPORT);
      setShowReportForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setReportBusy(false);
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

      <form className="upload-form" onSubmit={submitNote} style={{ marginBottom: 28 }}>
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

      <h3>Olay Mudahale Raporlari</h3>
      <div className="notes-list">
        {reports.map((r) => (
          <div className="note" key={r.id}>
            <div className="meta">
              <strong>{r.title}</strong> - {r.author || "anonim"} -{" "}
              {new Date(r.created_at).toLocaleString()}
            </div>
            <p>
              <strong>Ozet:</strong> {r.summary}
            </p>
            {r.root_cause && (
              <p>
                <strong>Kok neden:</strong> {r.root_cause}
              </p>
            )}
            {r.actions_taken && (
              <p>
                <strong>Yapilan islemler:</strong> {r.actions_taken}
              </p>
            )}
            {r.resolution && (
              <p>
                <strong>Cozum:</strong> {r.resolution}
              </p>
            )}
            {r.recommendations && (
              <p>
                <strong>Oneriler:</strong> {r.recommendations}
              </p>
            )}
          </div>
        ))}
        {reports.length === 0 && <p className="muted">Henuz rapor yok.</p>}
      </div>

      {!showReportForm && (
        <button className="secondary" onClick={() => setShowReportForm(true)}>
          Rapor Olustur
        </button>
      )}

      {showReportForm && (
        <form className="upload-form" onSubmit={submitReport} style={{ marginTop: 12 }}>
          <input
            placeholder="Rapor basligi *"
            value={reportForm.title}
            onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
          />
          <textarea
            placeholder="Ozet *"
            rows={2}
            value={reportForm.summary}
            onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })}
          />
          <textarea
            placeholder="Kok neden (opsiyonel)"
            rows={2}
            value={reportForm.root_cause}
            onChange={(e) => setReportForm({ ...reportForm, root_cause: e.target.value })}
          />
          <textarea
            placeholder="Yapilan islemler (opsiyonel)"
            rows={2}
            value={reportForm.actions_taken}
            onChange={(e) => setReportForm({ ...reportForm, actions_taken: e.target.value })}
          />
          <textarea
            placeholder="Cozum (opsiyonel)"
            rows={2}
            value={reportForm.resolution}
            onChange={(e) => setReportForm({ ...reportForm, resolution: e.target.value })}
          />
          <textarea
            placeholder="Oneriler (opsiyonel)"
            rows={2}
            value={reportForm.recommendations}
            onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })}
          />
          <div className="filters">
            <button type="submit" disabled={reportBusy}>
              {reportBusy ? "Kaydediliyor..." : "Raporu Kaydet"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setShowReportForm(false);
                setReportForm(EMPTY_REPORT);
              }}
            >
              Vazgec
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
