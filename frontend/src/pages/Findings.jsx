import { useEffect, useState } from "react";
import { api } from "../api/client";
import SeverityBadge from "../components/SeverityBadge";

export default function Findings() {
  const [findings, setFindings] = useState([]);
  const [severity, setSeverity] = useState("");
  const [sourceTool, setSourceTool] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);

  function load() {
    const params = {};
    if (severity) params.severity = severity;
    if (sourceTool) params.source_tool = sourceTool;
    if (q) params.q = q;
    api.listFindings(params).then(setFindings).catch((e) => setError(e.message));
  }

  useEffect(load, [severity, sourceTool, q]);

  return (
    <div>
      <h2>Bulgular</h2>

      <div className="filters">
        <input placeholder="Baslikta ara..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Tum Onem Dereceleri</option>
          <option value="critical">critical</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
          <option value="info">info</option>
        </select>
        <select value={sourceTool} onChange={(e) => setSourceTool(e.target.value)}>
          <option value="">Tum Araclar</option>
          <option value="nuclei">nuclei</option>
          <option value="openvas">openvas</option>
          <option value="nessus">nessus</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Kaynak</th>
            <th>Host</th>
            <th>Port</th>
            <th>Baslik</th>
            <th>CVE</th>
            <th>Onem</th>
            <th>Son Gorulme</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.id}>
              <td>{f.source_tool}</td>
              <td>{f.host}</td>
              <td>{f.port || "-"}</td>
              <td>{f.title}</td>
              <td>{f.cve || "-"}</td>
              <td><SeverityBadge severity={f.severity} /></td>
              <td>{new Date(f.last_seen).toLocaleString()}</td>
            </tr>
          ))}
          {findings.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">Bulgu yok.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
