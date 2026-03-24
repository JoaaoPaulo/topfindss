import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { Category, Product, AuthState } from "./types";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { token: null, user: null };
  });

  const fetchCategories = () => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(setCategories);
  };

  useEffect(() => {
    fetchCategories();

    // Verifies auth on token
    if (auth.token) {
      fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${auth.token}` }
      }).then(res => {
        if (!res.ok) handleLogout();
        else return res.json();
      }).then(data => {
        if (data && data.user) {
          setAuth(prev => ({ ...prev, user: data.user }));
        }
      }).catch(() => handleLogout());
    }
  }, []);

  const handleLogin = (token: string, user: any) => {
    const state = { token, user };
    setAuth(state);
    localStorage.setItem("auth", JSON.stringify(state));
  };

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem("auth");
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout categories={categories} auth={auth} onLogout={handleLogout}><Home categories={categories} /></Layout>} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/admin/login" element={<Login onLogin={handleLogin} adminFlow />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/admin" element={auth.user?.is_admin ? <AdminDashboard auth={auth} onLogout={handleLogout} categories={categories} onRefreshCategories={fetchCategories} /> : <div className="p-10 text-center"><h1 className="text-2xl font-bold">Acesso Negado</h1><p>Você não tem permissão para acessar o AdminHub.</p> <button onClick={() => window.location.href = '/'} className="mt-4 px-4 py-2 bg-brand text-white rounded">Voltar</button></div>} />
      </Routes>
    </Router>
  );
}
