import React, { useEffect, useState } from "react";
import { analyticsAPI } from "../services/api";

function formatMonth(y, m) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function AnalyticsDashboard() {
  const [kpis, setKpis] = useState(null);
  const [cohorts, setCohorts] = useState({ time_series: [], hotspots: [] });
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ category: "", zone: "" });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.zone) params.zone = filters.zone;

      const [kRes, cRes, aRes] = await Promise.all([
        analyticsAPI.kpis(params),
        analyticsAPI.cohorts(params),
        analyticsAPI.agents(params),
      ]);

      setKpis(kRes.data);
      setCohorts(cRes.data || { time_series: [], hotspots: [] });
      setAgents((aRes.data && aRes.data.agents) || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.category, filters.zone]);

  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ marginBottom: "0.5rem" }}>Analytics Dashboard</h1>
            <p style={{ color: "#6b7280" }}>
              Requests over time, hotspots, SLA signals, and agent productivity.
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  color: "#374151",
                }}
              >
                Category
              </label>
              <input
                name="category"
                value={filters.category}
                onChange={handleFilter}
                placeholder="pothole"
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  color: "#374151",
                }}
              >
                Zone
              </label>
              <input
                name="zone"
                value={filters.zone}
                onChange={handleFilter}
                placeholder="ZONE-DT-01"
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading analytics...</div>}

      {!loading && kpis && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>KPI Overview</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            <div className="card" style={{ marginBottom: 0 }}>
              <h4>Backlog</h4>
              <ul style={{ listStyle: "none", marginTop: "0.5rem" }}>
                {Object.entries(kpis.backlog || {}).map(([status, count]) => (
                  <li
                    key={status}
                    style={{ color: "#4b5563", marginBottom: "0.35rem" }}
                  >
                    <strong>{status}</strong>: {count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h4>Avg Resolution</h4>
              <p
                style={{
                  color: "#111827",
                  fontSize: "1.5rem",
                  marginTop: "0.5rem",
                }}
              >
                {kpis.avg_resolution_hours
                  ? `${kpis.avg_resolution_hours.toFixed(1)} hrs`
                  : "—"}
              </p>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h4>SLA Breach Rate</h4>
              <p
                style={{
                  color: "#111827",
                  fontSize: "1.5rem",
                  marginTop: "0.5rem",
                }}
              >
                {kpis.sla_breach_rate !== null &&
                kpis.sla_breach_rate !== undefined
                  ? `${(kpis.sla_breach_rate * 100).toFixed(1)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Requests Over Time</h2>
          {cohorts.time_series.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No data available.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {cohorts.time_series.map((row) => (
                <div
                  key={`${row.year}-${row.month}`}
                  className="card"
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {formatMonth(row.year, row.month)}
                  </div>
                  <div style={{ color: "#2563eb" }}>Total: {row.count}</div>
                  <div style={{ color: "#059669" }}>
                    Resolved: {row.resolved}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Hotspot Areas (Top 10)</h2>
          {cohorts.hotspots.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No hotspots found.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {cohorts.hotspots.map((h) => (
                <li
                  key={h.zone_id || "unknown"}
                  style={{
                    padding: "0.5rem 0",
                    borderBottom: "2px solid black",
                  }}
                >
                  <strong>{h.zone_id || "Unknown"}</strong> – {h.count} requests
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Agent Productivity</h2>
          {agents.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No agent data.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid black",
                  }}
                >
                  <th style={{ padding: "0.5rem" }}>Agent</th>
                  <th style={{ padding: "0.5rem" }}>Open</th>
                  <th style={{ padding: "0.5rem" }}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr
                    key={a.agent_id}
                    style={{ borderBottom: "2px solid black" }}
                  >
                    <td style={{ padding: "0.5rem" }}>
                      {a.agent_name || "Unknown"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{a.open}</td>
                    <td style={{ padding: "0.5rem" }}>{a.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
