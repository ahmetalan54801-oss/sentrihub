import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clearStoredAuth, getStoredAuth, getStoredRole } from "./api/client";
import AlertDetail from "./pages/AlertDetail";
import AlertsQueue from "./pages/AlertsQueue";
import Dashboard from "./pages/Dashboard";
import Findings from "./pages/Findings";
import IncidentReports from "./pages/IncidentReports";
import LiveMonitor from "./pages/LiveMonitor";
import Login from "./pages/Login";
import Scan from "./pages/Scan";
import Shifts from "./pages/Shifts";
import Upload from "./pages/Upload";
import Users from "./pages/Users";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getStoredAuth()));
  const isAdmin = getStoredRole() === "admin";

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  function logout() {
    clearStoredAuth();
    setAuthed(false);
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>SentriHub</h1>
        <p className="muted" style={{ marginTop: -18, marginBottom: 20, fontSize: 12 }}>
          Sizma Testi &amp; SOC L1 Entegrasyon Araci
        </p>
        <nav>
          <NavLink to="/" end>
            Panel
          </NavLink>
          <NavLink to="/alerts">Triage Kuyrugu</NavLink>
          <NavLink to="/live">Canli Log Akisi</NavLink>
          <NavLink to="/findings">Bulgular</NavLink>
          <NavLink to="/shifts">Nobet Cizelgesi</NavLink>
          <NavLink to="/incidents">Olay Raporlari</NavLink>
          {isAdmin && <NavLink to="/scan">Tarama Baslat</NavLink>}
          <NavLink to="/upload">Rapor Yukle</NavLink>
          {isAdmin && <NavLink to="/users">Kullanicilar</NavLink>}
        </nav>
        <button className="secondary" style={{ marginTop: 20, width: "100%" }} onClick={logout}>
          Cikis Yap
        </button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<AlertsQueue />} />
          <Route path="/alerts/:id" element={<AlertDetail />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/incidents" element={<IncidentReports />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/users" element={<Users />} />
        </Routes>
      </main>
    </div>
  );
}
