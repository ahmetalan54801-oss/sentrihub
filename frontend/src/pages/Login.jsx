import { useState } from "react";
import { verifyCredentials } from "../api/client";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyCredentials(username, password);
      onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <form className="upload-form detail-box" onSubmit={submit} style={{ width: 320 }}>
        <h2 style={{ margin: 0 }}>SentriHub</h2>
        <p className="muted" style={{ marginTop: -8 }}>Giris yap</p>
        <input
          placeholder="Kullanici adi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Sifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Kontrol ediliyor..." : "Giris Yap"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
