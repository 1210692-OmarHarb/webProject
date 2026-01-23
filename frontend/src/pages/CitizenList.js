import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_BASE_URL = "http://localhost:8000";

function CitizenList() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tempFilter, setTempFilter] = useState({
    verification_state: "",
    city: "",
  });
  const [filter, setFilter] = useState({
    verification_state: "",
    city: "",
  });

  useEffect(() => {
    fetchCitizens();
  }, [filter]);

  const fetchCitizens = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.verification_state)
        params.verification_state = filter.verification_state;
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

  const handleSearch = () => {
    setFilter(tempFilter);
  };

  const handleClearFilters = () => {
    setTempFilter({ verification_state: "", city: "" });
    setFilter({ verification_state: "", city: "" });
  };

  const filteredCitizens = citizens.filter((citizen) => {
    const matchesVerification =
      !tempFilter.verification_state ||
      citizen.verification_state === tempFilter.verification_state;
    const matchesCity =
      !tempFilter.city ||
      citizen.city.toLowerCase().includes(tempFilter.city.toLowerCase());
    return matchesVerification && matchesCity;
  });

  const getVerificationBadge = (state) => {
    const badges = {
      verified: { text: "✓ Verified", color: "#10b981" },
      unverified: { text: "○ Unverified", color: "#6b7280" },
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1>👥 Citizen Portal</h1>
        <Link to="/citizens/register" className="btn-primary">
          Register New Citizen
        </Link>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#f9fafb",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
            }}
          >
            Verification Status
          </label>
          <select
            value={tempFilter.verification_state}
            onChange={(e) =>
              setTempFilter({
                ...tempFilter,
                verification_state: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "1rem 1.25rem",
              borderRadius: "6px",
              border: "2px solid black",
            }}
          >
            <option value="">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
            }}
          >
            City
          </label>
          <input
            type="text"
            value={tempFilter.city}
            onChange={(e) =>
              setTempFilter({ ...tempFilter, city: e.target.value })
            }
            placeholder="Enter city..."
            style={{
              width: "100%",
              padding: "1rem 1.25rem",
              borderRadius: "6px",
              border: "2px solid black",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
          <button
            onClick={handleSearch}
            style={{
              padding: "1rem 2rem",
              borderRadius: "6px",
              border: "2px solid black",
              background: "white",
              color: "black",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "black";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "black";
            }}
          >
            Search
          </button>
          <button
            onClick={handleClearFilters}
            style={{
              padding: "1rem 2rem",
              borderRadius: "6px",
              border: "2px solid black",
              background: "white",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Citizens Summary */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "1.1rem", color: "#6b7280" }}>
          Showing <strong>{filteredCitizens.length}</strong> citizens
        </p>
      </div>

      {/* Citizens Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {filteredCitizens.map((citizen) => (
          <Link
            key={citizen._id}
            to={`/citizens/${citizen._id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                border: "2px solid black",
                borderRadius: "8px",
                padding: "1.5rem",
                background: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
                cursor: "pointer",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 8px rgba(255,255,255,0.5)";
                e.currentTarget.style.background = "black";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "black";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "1rem",
                }}
              >
                <h3
                  style={{ margin: "0", color: "#111827", fontSize: "1.25rem" }}
                >
                  {citizen.full_name}
                </h3>
                {getVerificationBadge(citizen.verification_state)}
              </div>

              <div
                style={{
                  fontSize: "0.95rem",
                  color: "#6b7280",
                  lineHeight: "1.8",
                }}
              >
                {citizen.email && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>📧</span>
                    <span>{citizen.email}</span>
                  </div>
                )}
                {citizen.phone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>📱</span>
                    <span>{citizen.phone}</span>
                  </div>
                )}
                {citizen.city && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>Zone:</span>
                    <span>
                      {citizen.city}
                      {citizen.neighborhood ? `, ${citizen.neighborhood}` : ""}
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "2px solid black",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  color: "#6b7280",
                }}
              >
                <span>⭐ {citizen.avg_rating?.toFixed(1) || "0.0"} rating</span>
                <span>📋 {citizen.total_requests || 0} requests</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {citizens.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          <h2>No citizens found</h2>
          <p style={{ color: "#6b7280" }}>
            Try adjusting your filters or register a new citizen.
          </p>
        </div>
      )}
    </div>
  );
}

export default CitizenList;
