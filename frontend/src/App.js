import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import CreateRequest from "./pages/CreateRequest";
import RequestList from "./pages/RequestList";
import RequestDetails from "./pages/RequestDetails";
import CitizenList from "./pages/CitizenList";
import CitizenProfile from "./pages/CitizenProfile";
import CitizenRegister from "./pages/CitizenRegister";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import LiveMap from "./pages/LiveMap";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <Router>
      <div className="App">
        <header className="header">
          <button className="hamburger" onClick={toggleSidebar}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <Link to="/" className="header-logo">
            Citizen Services Tracker
          </Link>
          <Link
            to="/"
            className="info-btn"
            title="About"
            aria-label="About / Home"
          >
            i
          </Link>
        </header>

        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-overlay" onClick={closeSidebar}></div>
          <nav className="sidebar-nav">
            <Link to="/" className="nav-link" onClick={closeSidebar}>
              Home
            </Link>
            <Link to="/requests" className="nav-link" onClick={closeSidebar}>
              View Requests
            </Link>
            <Link to="/create" className="nav-link" onClick={closeSidebar}>
              Submit Request
            </Link>
            <Link to="/citizens" className="nav-link" onClick={closeSidebar}>
              Citizens
            </Link>
            <Link to="/agents" className="nav-link" onClick={closeSidebar}>
              Agents
            </Link>
            <Link to="/analytics" className="nav-link" onClick={closeSidebar}>
              Analytics
            </Link>
            <Link to="/map" className="nav-link" onClick={closeSidebar}>
              Live Map
            </Link>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateRequest />} />
            <Route path="/requests" element={<RequestList />} />
            <Route path="/requests/:id" element={<RequestDetails />} />
            <Route path="/citizens" element={<CitizenList />} />
            <Route path="/citizens/:id" element={<CitizenProfile />} />
            <Route path="/citizens/register" element={<CitizenRegister />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/map" element={<LiveMap />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
