import React from "react";
import { Link, useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      {/* Hero Section */}
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          background: "white",
          color: "black",
          border: "2px solid black",
        }}
      >
        <h1 style={{ fontSize: "3rem", marginBottom: "2rem", color: "black" }}>
          Citizen Services Tracker
        </h1>
        <p style={{ fontSize: "1.3rem", marginBottom: "2rem" }}>
          Report and track community service requests
        </p>
        <p style={{ fontSize: "1rem" }}>
          Choose how you want to submit your report
        </p>
      </div>

      {/* Two Main Options */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "2rem",
          marginTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        {/* Anonymous Report Option */}
        <div
          className="card"
          style={{
            padding: "2.5rem",
            textAlign: "center",
            border: "2px solid black",
            transition: "all 0.3s ease",
            cursor: "pointer",
            backgroundColor: "white",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "black";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow =
              "0 0 8px rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = "black";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onClick={() => navigate("/create")}
        >
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
            Anonymous Report
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              marginBottom: "1.5rem",
              lineHeight: "1.6",
            }}
          >
            Report issues without providing personal information. Quick and
            easy.
          </p>
          <ul
            style={{
              textAlign: "left",
              marginBottom: "2rem",
              paddingLeft: "1.5rem",
            }}
          >
            <li style={{ marginBottom: "0.5rem" }}>
              ✓ No registration required
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              ✓ Submit reports instantly
            </li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Complete privacy</li>
            <li style={{ marginBottom: "0.5rem" }}>
              ✗ Cannot track your reports
            </li>
          </ul>
          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
            }}
          >
            Report Anonymously
          </button>
        </div>

        {/* Verified Citizen Report Option */}
        <div
          className="card"
          style={{
            padding: "2.5rem",
            textAlign: "center",
            border: "2px solid black",
            background: "white",
            transition: "all 0.3s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "black";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "translateY(-5px)";
            e.currentTarget.style.boxShadow =
              "0 0 8px rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = "black";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onClick={() => navigate("/citizens")}
        >
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
            Verified Report
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              marginBottom: "1.5rem",
              lineHeight: "1.6",
            }}
          >
            Report as a verified citizen. Track your submissions and get
            updates.
          </p>
          <ul
            style={{
              textAlign: "left",
              marginBottom: "2rem",
              paddingLeft: "1.5rem",
            }}
          >
            <li style={{ marginBottom: "0.5rem" }}>✓ Track all your reports</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Receive status updates</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Build report history</li>
            <li style={{ marginBottom: "0.5rem" }}>
              ✓ Add comments & evidence
            </li>
          </ul>
          <button
            className="btn btn-success"
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
            }}
          >
            Report as Verified Citizen
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div
        className="card"
        style={{
          padding: "2rem",
          background: "white",
          border: "2px solid black",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem", color: "black" }}>Quick Links</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <Link to="/requests" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "1.5rem",
                background: "white",
                borderRadius: "8px",
                border: "2px solid black",
                textAlign: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "black";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
            >
              <strong>View All Requests</strong>
            </div>
          </Link>

          <Link to="/citizens/register" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "1.5rem",
                background: "white",
                borderRadius: "8px",
                border: "2px solid black",
                textAlign: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "black";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.color = "black";
              }}
            >
              <strong>Register as Citizen</strong>
            </div>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginTop: "2rem",
        }}
      >
        <div className="card">
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🚧</div>
          <h3>Report Issues</h3>
          <p>
            Submit service requests for potholes, streetlights, garbage
            collection, and more
          </p>
        </div>

        <div className="card">
          <h3>Track Location</h3>
          <p>View requests on an interactive map with precise geolocation</p>
        </div>

        <div className="card">
          <h3>Monitor Status</h3>
          <p>
            Keep track of your requests and their resolution status in real-time
          </p>
        </div>

        <div className="card">
          <h3>Stay Updated</h3>
          <p>
            Add comments, upload evidence, and communicate with service teams
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
