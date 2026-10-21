import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { api } from "../services/api";
import { usePortfolio } from "../context/PortfolioContext";
import AdminLogin from "./AdminLogin";
import OverviewSector from "./components/OverviewSector";
import IntroSector from "./components/IntroSector";
import AboutSector from "./components/AboutSector";
import ProjectsSector from "./components/ProjectsSector";
import ExperienceSector from "./components/ExperienceSector";
import TimelineSector from "./components/TimelineSector";
import TechStackSector from "./components/TechStackSector";
import MessagesSector from "./components/MessagesSector";
import SettingsSector from "./components/SettingsSector";
import "./styles/Admin.css";

import {
  VscDashboard,
  VscFlame,
  VscAccount,
  VscProject,
  VscBriefcase,
  VscMilestone,
  VscTools,
  VscMail,
  VscSettingsGear,
  VscSignOut,
  VscGlobe,
  VscDatabase,
} from "react-icons/vsc";

export default function AdminApp() {
  const history = useHistory();
  const { isBackendOnline, refreshPortfolio } = usePortfolio();
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep the admin portal out of search results
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = "Admin | Aranya Kishor Das";
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  // Check existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("portfolio_admin_token");
      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res && res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem("portfolio_admin_token");
        }
      } catch (err) {
        localStorage.removeItem("portfolio_admin_token");
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Poll / check unread messages
  useEffect(() => {
    if (user) {
      api.getMessages()
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            const count = res.data.filter((m) => !m.is_read).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    }
  }, [user, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("portfolio_admin_token");
    localStorage.removeItem("portfolio_admin_user");
    setUser(null);
  };

  const handleBackToSite = () => {
    history.push("/");
  };

  if (authChecking) {
    return (
      <div className="admin-login-wrap" style={{ color: "#8b949e" }}>
        Checking authorization...
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLoginSuccess={(u) => setUser(u)} onBackToSite={handleBackToSite} />;
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: <VscDashboard /> },
    { id: "intro", label: "Hero & Intro", icon: <VscFlame /> },
    { id: "about", label: "About Me", icon: <VscAccount /> },
    { id: "projects", label: "Projects & Code", icon: <VscProject /> },
    { id: "experience", label: "Experience", icon: <VscBriefcase /> },
    { id: "timeline", label: "Timeline", icon: <VscMilestone /> },
    { id: "techstack", label: "Tech Stack", icon: <VscTools /> },
    { id: "messages", label: "Inbox Messages", icon: <VscMail />, badge: unreadCount },
    { id: "settings", label: "Settings & DB", icon: <VscSettingsGear /> },
  ];

  return (
    <div className="admin-wrapper">
      {/* Fixed Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand-icon">A</div>
          <div>
            <div className="admin-brand-title">Aranya Portfolio</div>
            <div className="admin-brand-sub">Admin Dashboard</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && <span className="admin-nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={handleBackToSite}>
            <VscGlobe />
            <span>View Live Site</span>
          </button>
          <button className="admin-nav-item" onClick={handleLogout} style={{ color: "#f85149" }}>
            <VscSignOut />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            {navItems.find((n) => n.id === activeTab)?.icon}
            <span>{navItems.find((n) => n.id === activeTab)?.label}</span>
          </div>

          <div className="admin-header-actions">
            <div className="admin-status-pill">
              <span className={`admin-status-dot ${isBackendOnline ? "online" : "offline"}`} />
              <span>{isBackendOnline ? "PostgreSQL Connected" : "Local Resilient Mode"}</span>
            </div>

            <div style={{ fontSize: "0.85rem", color: "#8b949e" }}>
              Signed in as <strong style={{ color: "#fff" }}>{user.username}</strong>
            </div>
          </div>
        </header>

        <div className="admin-content-body">
          {activeTab === "overview" && <OverviewSector onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === "intro" && <IntroSector />}
          {activeTab === "about" && <AboutSector />}
          {activeTab === "projects" && <ProjectsSector />}
          {activeTab === "experience" && <ExperienceSector />}
          {activeTab === "timeline" && <TimelineSector />}
          {activeTab === "techstack" && <TechStackSector />}
          {activeTab === "messages" && <MessagesSector />}
          {activeTab === "settings" && <SettingsSector />}
        </div>
      </main>
    </div>
  );
}
