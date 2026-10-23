import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import "./styles/Admin.css";
import { VscLock, VscKey, VscAccount, VscArrowLeft } from "react-icons/vsc";

export default function AdminLogin({ onLoginSuccess, onBackToSite }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setSlowNotice(true);
      }, 3500);
    } else {
      setSlowNotice(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    setSlowNotice(false);

    try {
      if (isRegisterMode) {
        const res = await api.register({ username, email, password });
        if (res && res.token) {
          localStorage.setItem("portfolio_admin_token", res.token);
          localStorage.setItem("portfolio_admin_user", JSON.stringify(res.user));
          onLoginSuccess(res.user);
        } else {
          setSuccessMsg("Admin registered! Please login.");
          setIsRegisterMode(false);
        }
      } else {
        const res = await api.login({ username, password });
        if (res && res.token) {
          localStorage.setItem("portfolio_admin_token", res.token);
          localStorage.setItem("portfolio_admin_user", JSON.stringify(res.user));
          onLoginSuccess(res.user);
        }
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to backend server. Make sure your Render backend URL is active."
          : err.message || "Authentication failed. Check credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-box">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 54,
              height: 54,
              background: "#10b981",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 26,
              color: "#0a0d14",
              boxShadow: "0 0 20px rgba(100, 217, 138, 0.4)",
            }}
          >
            <VscLock />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
            {isRegisterMode ? "Create Admin Account" : "Portfolio Admin Portal"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: 0 }}>
            {isRegisterMode
              ? "Set up your credentials to manage your site"
              : "Manage PostgreSQL sectors, projects & messages"}
          </p>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: 18 }}>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="admin-alert admin-alert-success" style={{ marginBottom: 18 }}>
            <span>{successMsg}</span>
          </div>
        )}

        {slowNotice && (
          <div
            className="admin-alert"
            style={{
              marginBottom: 18,
              background: "rgba(88, 166, 255, 0.1)",
              borderColor: "rgba(88, 166, 255, 0.3)",
              color: "#58a6ff",
              fontSize: "0.82rem",
            }}
          >
            <span>⏳ Waking up backend server (Render free tier takes ~30s on first request)...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-label">Username / Email</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="admin-input"
                placeholder="AKD or aranya.akd@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <VscAccount style={{ position: "absolute", right: 12, top: 12, color: "#8b949e" }} />
            </div>
          </div>

          {isRegisterMode && (
            <div className="admin-form-group">
              <label className="admin-label">Admin Email</label>
              <input
                type="email"
                className="admin-input"
                placeholder="aranya.akd@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="admin-form-group">
            <label className="admin-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                className="admin-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <VscKey style={{ position: "absolute", right: 12, top: 12, color: "#8b949e" }} />
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
            disabled={loading}
          >
            {loading
              ? "Authenticating..."
              : isRegisterMode
              ? "Register & Enter"
              : "Sign In to Dashboard"}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            style={{
              background: "none",
              border: "none",
              color: "#58a6ff",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {isRegisterMode ? "← Already have an account? Sign in" : "Register new admin"}
          </button>

          <button
            type="button"
            onClick={onBackToSite}
            style={{
              background: "none",
              border: "none",
              color: "#8b949e",
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <VscArrowLeft /> Return to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
