import React from "react";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="container">
      <div className="card">
        <h1>Welcome to Citizen Services Tracker</h1>
        <p style={{ marginTop: "1rem", fontSize: "1.1rem", color: "#7f8c8d" }}>
          Report and track service requests in your community
        </p>

        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link to="/create">
            <button className="btn btn-primary">Submit a Request</button>
          </Link>
          <Link to="/requests">
            <button className="btn btn-success">View All Requests</button>
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <div className="card">
          <h3>🚧 Report Issues</h3>
          <p>Submit service requests for potholes, streetlights, and more</p>
        </div>

        <div className="card">
          <h3>📍 Track Location</h3>
          <p>View requests on an interactive map</p>
        </div>

        <div className="card">
          <h3>📊 Monitor Status</h3>
          <p>Keep track of your requests and their resolution status</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
