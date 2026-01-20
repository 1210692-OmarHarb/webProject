import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import CreateRequest from "./pages/CreateRequest";
import RequestList from "./pages/RequestList";
import RequestDetails from "./pages/RequestDetails";

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
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateRequest />} />
          <Route path="/requests" element={<RequestList />} />
          <Route path="/requests/:id" element={<RequestDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
