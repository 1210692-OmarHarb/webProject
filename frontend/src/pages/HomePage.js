import React from "react";
import { Link, useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      {/* Hero Section */}
      <div className="card" style={{ 
        textAlign: "center", 
        padding: "3rem 2rem",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        border: "none"
      }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "white" }}>
          🏛️ Citizen Services Tracker
        </h1>
        <p style={{ fontSize: "1.3rem", marginBottom: "2rem", opacity: 0.9 }}>
          Report and track community service requests
        </p>
        <p style={{ fontSize: "1rem", opacity: 0.8 }}>
          Choose how you want to submit your report
        </p>
      </div>

      {/* Two Main Options */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "2rem",
        marginTop: "2rem",
        marginBottom: "2rem"
      }}>
        {/* Anonymous Report Option */}
        <div className="card" style={{
          padding: "2.5rem",
          textAlign: "center",
          border: "2px solid #e5e7eb",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#3b82f6";
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e5e7eb";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={() => navigate("/create")}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🕶️</div>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#1f2937" }}>
            Anonymous Report
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#6b7280", marginBottom: "1.5rem", lineHeight: "1.6" }}>
            Report issues without providing personal information. Quick and easy.
          </p>
          <ul style={{ 
            textAlign: "left", 
            color: "#6b7280", 
            marginBottom: "2rem",
            paddingLeft: "1.5rem"
          }}>
            <li style={{ marginBottom: "0.5rem" }}>✓ No registration required</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Submit reports instantly</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Complete privacy</li>
            <li style={{ marginBottom: "0.5rem" }}>✗ Cannot track your reports</li>
          </ul>
          <button className="btn btn-primary" style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem"
          }}>
            Report Anonymously
          </button>
        </div>

        {/* Verified Citizen Report Option */}
        <div className="card" style={{
          padding: "2.5rem",
          textAlign: "center",
          border: "2px solid #10b981",
          background: "#f0fdf4",
          transition: "all 0.3s ease",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#059669";
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.boxShadow = "0 10px 25px rgba(16,185,129,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#10b981";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={() => navigate("/citizens")}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "#065f46" }}>
            Verified Report
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#047857", marginBottom: "1.5rem", lineHeight: "1.6" }}>
            Report as a verified citizen. Track your submissions and get updates.
          </p>
          <ul style={{ 
            textAlign: "left", 
            color: "#047857", 
            marginBottom: "2rem",
            paddingLeft: "1.5rem"
          }}>
            <li style={{ marginBottom: "0.5rem" }}>✓ Track all your reports</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Receive status updates</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Build report history</li>
            <li style={{ marginBottom: "0.5rem" }}>✓ Add comments & evidence</li>
          </ul>
          <button className="btn btn-success" style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem",
            background: "#10b981"
          }}>
            Report as Verified Citizen
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card" style={{ padding: "2rem", background: "#f9fafb" }}>
        <h3 style={{ marginBottom: "1.5rem", color: "#1f2937" }}>Quick Links</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem"
        }}>
          <Link to="/requests" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "1.5rem",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              textAlign: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
              <strong style={{ color: "#1f2937" }}>View All Requests</strong>
            </div>
          </Link>
          
          <Link to="/citizens/register" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "1.5rem",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              textAlign: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
              <strong style={{ color: "#1f2937" }}>Register as Citizen</strong>
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
          <p>Submit service requests for potholes, streetlights, garbage collection, and more</p>
        </div>

        <div className="card">
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📍</div>
          <h3>Track Location</h3>
          <p>View requests on an interactive map with precise geolocation</p>
        </div>

        <div className="card">
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📊</div>
          <h3>Monitor Status</h3>
          <p>Keep track of your requests and their resolution status in real-time</p>
        </div>

        <div className="card">
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>💬</div>
          <h3>Stay Updated</h3>
          <p>Add comments, upload evidence, and communicate with service teams</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
