// src/App.jsx
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Login from "./components/Login";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectBoard from "./pages/ProjectBoard";

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try { await fetch(`${BASE_URL}/api/csrf/`, { credentials: 'include' }); } catch { }
      try {
        const r = await fetch(`${BASE_URL}/api/me/`, { credentials: 'include' });
        if (r.status === 401) setMe(null);
        else if (r.ok) setMe(await r.json());
        else setMe(null);
      } catch { setMe(null); }
      finally { setAuthLoading(false); }
    })();
  }, []);

  const getCookie = (name) =>
    document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || '';

  const handleLogout = async () => {
    try {
      await fetch(`${BASE_URL}/api/csrf/`, { credentials: "include" });
      await fetch(`${BASE_URL}/api/logout/`, {
        method: "POST", credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
    } finally {
      setMe(null);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#F4F5F8]" />;

  if (!me) {
    return <Login baseUrl={BASE_URL} onSuccess={(user) => setMe(user)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        logoSrc="/logo.svg"
        projectLabel="Проекты"
        username={me?.display_name || me?.username}
        role={me?.role || "Пользователь"}
        unreadCount={0}
        onLogout={handleLogout}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage baseUrl={BASE_URL} me={me} />} />
        <Route path="/projects/:id" element={<ProjectBoard baseUrl={BASE_URL} me={me} />} />

        {/* Защита от неизвестных маршрутов */}
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </div>
  );
}
