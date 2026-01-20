import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_BASE_URL = "http://localhost:8000";

function CitizenList() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    verification_state: "",
    city: ""
  });

  useEffect(() => {
    fetchCitizens();
  }, [filter]);

  const fetchCitizens = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.verification_state) params.verification_state = filter.verification_state;
      if (filter.city) params.city = filter.city;

      const response = await axios.get(`${API_BASE_URL}/citizens/`, { params });
      setCitizens(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch citizens: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationBadge = (state) => {
    const badges = {
      verified: { text: "✓ Verified", color: "#10b981" },
      unverified: { text: "○ Unverified", color: "#6b7280" }
    };
    const badge = badges[state] || badges.unverified;
    return (
      <span style={{ color: badge.color, fontWeight: "600" }}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Loading Citizens...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={fetchCitizens}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>👥 Citizen Portal</h1>
        <Link to="/citizens/register" className="btn-primary">
          Register New Citizen
        </Link>
      </div>

      {/* Filters */}
      <div style={{ 
        background: "#f9fafb", 
        padding: "1.5rem", 
        borderRadius: "8px", 
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
        <div style={{ flex: "1", minWidth: "200px" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Verification Status
          </label>
          <select
            value={filter.verification_state}
            onChange={(e) => setFilter({ ...filter, verification_state: e.target.value })}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div style={{ flex: "1", minWidth: "200px" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            City
          </label>
          <input
            type="text"
            value={filter.city}
            onChange={(e) => setFilter({ ...filter, city: e.target.value })}
            placeholder="Enter city..."
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={() => setFilter({ verification_state: "", city: "" })}
            style={{ padding: "0.5rem 1rem", borderRadius: "4px", border: "1px solid #ddd", background: "white", cursor: "pointer" }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Citizens Summary */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>
          Showing <strong>{citizens.length}</strong> citizens
        </p>
      </div>

      {/* Citizens Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
        gap: "1.5rem" 
      }}>
        {citizens.map((citizen) => (
          <Link
            key={citizen._id}
            to={`/citizens/${citizen._id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1.5rem",
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "all 0.2s",
              cursor: "pointer",
              height: "100%"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                <h3 style={{ margin: "0", color: "#111827", fontSize: "1.25rem" }}>
                  {citizen.full_name}
                </h3>
                {getVerificationBadge(citizen.verification_state)}
              </div>

              <div style={{ fontSize: "0.95rem", color: "#6b7280", lineHeight: "1.8" }}>
                {citizen.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📧</span>
                    <span>{citizen.email}</span>
                  </div>
                )}
                {citizen.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📱</span>
                    <span>{citizen.phone}</span>
                  </div>
                )}
                {citizen.city && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📍</span>
                    <span>{citizen.city}{citizen.neighborhood ? `, ${citizen.neighborhood}` : ""}</span>
                  </div>
                )}
              </div>

              <div style={{ 
                marginTop: "1rem", 
                paddingTop: "1rem", 
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
                color: "#6b7280"
              }}>
                <span>⭐ {citizen.avg_rating?.toFixed(1) || "0.0"} rating</span>
                <span>📋 {citizen.total_requests || 0} requests</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {citizens.length === 0 && (
        <div style={{ 
          textAlign: "center", 
          padding: "3rem", 
          background: "#f9fafb", 
          borderRadius: "8px" 
        }}>
          <h2>No citizens found</h2>
          <p style={{ color: "#6b7280" }}>Try adjusting your filters or register a new citizen.</p>
        </div>
      )}
    </div>
  );
}

export default CitizenList;
