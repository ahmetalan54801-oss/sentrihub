import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export default function Scan() {
  const [target, setTarget] = useState("");
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  function loadJobs() {
    api.listScans().then(setJobs).catch((e) => setError(e.message));
  }

  useEffect(() => {
    loadJobs();
    pollRef.current = setInterval(loadJobs, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!target.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.startScan(target.trim());
      setTarget("");
      loadJobs();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Nuclei Taramasi Baslat</h2>
      <p className="muted">
        Sadece sahip oldugun veya tarama izni aldigin hedefleri tara. Ornek hedef:
        http://192.168.1.181 veya 192.168.1.1
      </p>

      <form className="upload-form" onSubmit={submit}>
        <input
          placeholder="Hedef (URL veya host)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Baslatiliyor..." : "Taramayi Baslat"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <h3>Tarama Gecmisi</h3>
      <table>
        <thead>
          <tr>
            <th>Hedef</th>
            <th>Durum</th>
            <th>Bulgu</th>
            <th>Yeni Alert</th>
            <th>Baslatildi</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>{j.target}</td>
              <td>
                {j.status}
                {j.error ? ` - ${j.error.slice(0, 100)}` : ""}
              </td>
              <td>{j.findings_ingested ?? "-"}</td>
              <td>{j.alerts_created ?? "-"}</td>
              <td>{new Date(j.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Henuz tarama yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
