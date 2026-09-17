import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.listUsers().then(setUsers).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createUser({ username, password, role });
      setUsername("");
      setPassword("");
      setRole("analyst");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteUser(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Kullanicilar</h2>
      <p className="muted">
        <strong>admin</strong>: her seyi yapabilir (tarama baslatma, kullanici yonetimi dahil).{" "}
        <strong>analyst</strong>: goruntuleme ve triage yapabilir, tarama baslatamaz, kullanici
        yonetemez.
      </p>

      {error && <p className="error">{error}</p>}

      <table style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Kullanici Adi</th>
            <th>Rol</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>
                <button className="secondary" onClick={() => remove(u.id)}>
                  Sil
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Kullanici yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Yeni Kullanici Ekle</h3>
      <form className="upload-form" onSubmit={submit} style={{ maxWidth: 320 }}>
        <input
          placeholder="Kullanici adi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Sifre (en az 4 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="analyst">analyst</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" disabled={busy}>
          {busy ? "Ekleniyor..." : "Kullanici Ekle"}
        </button>
      </form>
    </div>
  );
}
