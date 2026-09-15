import { NavLink, Route, Routes } from "react-router-dom";
import AlertDetail from "./pages/AlertDetail";
import AlertsQueue from "./pages/AlertsQueue";
import Dashboard from "./pages/Dashboard";
import Findings from "./pages/Findings";
import Upload from "./pages/Upload";

export default function App() {
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
          <NavLink to="/findings">Bulgular</NavLink>
          <NavLink to="/upload">Rapor Yukle</NavLink>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<AlertsQueue />} />
          <Route path="/alerts/:id" element={<AlertDetail />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </main>
    </div>
  );
}
