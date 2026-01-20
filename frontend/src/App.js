import React from "react";
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

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              Citizen Services Tracker
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/requests" className="nav-link">
                  View Requests
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/create" className="nav-link">
                  Submit Request
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/citizens" className="nav-link">
                  Citizens
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/agents" className="nav-link">
                  Agents
                </Link>
              </li>
            </ul>
          </div>
        </nav>

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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
