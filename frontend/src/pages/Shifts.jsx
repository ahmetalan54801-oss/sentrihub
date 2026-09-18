import { useEffect, useState } from "react";
import { api, getStoredRole } from "../api/client";

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [oncall, setOncall] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const isAdmin = getStoredRole() === "admin";

  function load() {
    api.listShifts().then(setShifts).catch((e) => setError(e.message));
    api.getOncall().then(setOncall).catch(() => {});
    if (isAdmin) {
      api.listUsers().then(setUsers).catch(() => {});
    }
  }

  useEffect(load, []);

  async function assign(shiftId, username) {
    try {
      await api.updateShift(shiftId, { username: username || null });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Nobet Cizelgesi</h2>
      <p className="muted">
        Vardiya saatleri UTC'dir. Bir alert{" "}
        <code>SENTRIHUB_SLA_MINUTES</code> (varsayilan 30 dakika) icinde triage edilmezse
        otomatik olarak "escalated" durumuna gecer ve nobetci analiste devredilir.
      </p>

      {oncall && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Su an nobetci</div>
          <div className="value" style={{ fontSize: 20 }}>
            {oncall.username || <span className="muted">atanmadi</span>}
            {oncall.shift && <span className="muted"> ({oncall.shift})</span>}
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Vardiya</th>
            <th>Saat (UTC)</th>
            <th>Atanan Analist</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                {s.start_time} - {s.end_time}
              </td>
              <td>
                {isAdmin ? (
                  <select value={s.username || ""} onChange={(e) => assign(s.id, e.target.value)}>
                    <option value="">atanmadi</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.username}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                ) : (
                  s.username || <span className="muted">atanmadi</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
