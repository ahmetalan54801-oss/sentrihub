import { useState } from "react";
import { api } from "../api/client";

export default function Upload() {
  const [sourceTool, setSourceTool] = useState("nuclei");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.uploadReport(sourceTool, file);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Rapor Yukle</h2>
      <p className="muted">
        Nuclei (-jsonl), OpenVAS (XML) veya Nessus (.nessus) tarama ciktisini yukleyip
        bulgulari ve triage alertlerini otomatik olustur.
      </p>

      <form className="upload-form" onSubmit={submit}>
        <select value={sourceTool} onChange={(e) => setSourceTool(e.target.value)}>
          <option value="nuclei">Nuclei</option>
          <option value="openvas">OpenVAS</option>
          <option value="nessus">Nessus</option>
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={!file || busy}>
          {busy ? "Yukleniyor..." : "Yukle"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {result && (
        <p className="success">
          {result.findings_ingested} bulgu islendi. {result.alerts_created} yeni alert
          olusturuldu, {result.alerts_updated} mevcut alert guncellendi.
        </p>
      )}
    </div>
  );
}
