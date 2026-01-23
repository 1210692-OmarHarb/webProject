import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { agentsAPI } from "../services/api";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const agentIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#000" stroke="#fff" stroke-width="2"/>
      <circle cx="12" cy="9" r="3" fill="#fff"/>
      <path d="M12 14 L12 18 M9 16 L15 16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function AgentLocationMarker({ position, setPosition, setZone }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition([lat, lng]);

      let zone = "ZONE-DT-01";
      if (lat >= 31.93 && lat <= 31.96 && lng >= 35.9 && lng <= 35.93) {
        zone = "ZONE-DT-01";
      } else if (lat >= 31.96 && lng >= 35.9) {
        zone = "ZONE-N-03";
      } else if (lat >= 31.93 && lng <= 35.9) {
        zone = "ZONE-W-02";
      }
      setZone(zone);
    },
  });

  return position ? (
    <Marker position={position} icon={agentIcon}>
      <Popup>
        <strong>Agent Base Location</strong>
        <br />
        Click anywhere to move
      </Popup>
    </Marker>
  ) : null;
}

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentPosition, setAgentPosition] = useState([31.9539, 35.9106]);
  const [form, setForm] = useState({
    name: "",
    type: "team",
    skills: "road",
    coverage_zones: "ZONE-DT-01",
    schedule: {
      Mon: { start: "08:00", end: "16:00" },
      Tue: { start: "08:00", end: "16:00" },
      Wed: { start: "08:00", end: "16:00" },
      Thu: { start: "08:00", end: "16:00" },
      Fri: { start: "08:00", end: "16:00" },
    },
  });
  const [staffKey, setStaffKey] = useState(
    localStorage.getItem("staffKey") || "",
  );
  const [agentId, setAgentId] = useState(localStorage.getItem("agentId") || "");

  const load = async () => {
    try {
      const res = await agentsAPI.list();
      setAgents(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveKeys = () => {
    localStorage.setItem("staffKey", staffKey);
    localStorage.setItem("agentId", agentId);
    alert("Keys saved to browser (localStorage)");
  };

  const setZoneFromMap = (zone) => {
    setForm({ ...form, coverage_zones: zone });
  };

  const deleteAgent = async (agentId, agentName) => {
    if (
      !window.confirm(`Delete agent "${agentName}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await agentsAPI.delete(agentId);
      alert("Agent deleted successfully");
      await load();
    } catch (err) {
      alert("Failed to delete agent. Ensure Staff Key is set.");
    }
  };

  const generateRandomKey = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomKey = "";
    for (let i = 0; i < 32; i++) {
      randomKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffKey(randomKey);
    alert(
      `Generated random key:\n\n${randomKey}\n\nCopy it and add to backend/.env:\nSTAFF_API_KEY=${randomKey}`,
    );
  };

  const createAgent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        type: form.type,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        coverage_zones: form.coverage_zones
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean),
        schedule: Object.entries(form.schedule).map(([day, v]) => ({
          day,
          start: v.start,
          end: v.end,
        })),
        base_location: {
          type: "Point",
          coordinates: [agentPosition[1], agentPosition[0]],
        },
      };
      await agentsAPI.create(payload);
      setForm({ ...form, name: "" });
      await load();
      alert("Agent created");
    } catch (err) {
      alert("Failed to create agent. Ensure Staff Key is set in Keys panel.");
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h1>Service Agents</h1>
        <p>Manage agents/teams, schedule, coverage zones, and skills.</p>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>Keys</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <label>Staff Key (for admin actions)</label>
            <input
              value={staffKey}
              onChange={(e) => setStaffKey(e.target.value)}
              placeholder="STAFF_API_KEY"
              style={{
                padding: "1rem 1.25rem",
                border: "2px solid black",
                borderRadius: "6px",
                fontSize: "1rem",
                backgroundColor: "white",
                color: "black",
                width: "100%",
              }}
            />
          </div>
          <div>
            <label>Agent Id (for milestone actions)</label>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="ObjectId of agent"
              style={{
                padding: "1rem 1.25rem",
                border: "2px solid black",
                borderRadius: "6px",
                fontSize: "1rem",
                backgroundColor: "white",
                color: "black",
                width: "100%",
              }}
            />
          </div>
        </div>
        <button
          onClick={saveKeys}
          style={{
            padding: "1rem 2rem",
            border: "2px solid black",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "black",
            fontWeight: "500",
            transition: "all 0.3s",
            marginTop: "0.75rem",
            marginRight: "0.5rem",
          }}
        >
          Save Keys
        </button>
        <button
          onClick={generateRandomKey}
          style={{
            padding: "1rem 2rem",
            border: "2px solid black",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "black",
            color: "white",
            fontWeight: "500",
            transition: "all 0.3s",
            marginTop: "0.75rem",
          }}
        >
          Generate Random Key
        </button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>Create Agent/Team</h2>
        <form onSubmit={createAgent}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                  width: "100%",
                }}
              />
            </div>
            <div>
              <label>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <option value="agent">Agent</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label>Skills (comma separated)</label>
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                  width: "100%",
                }}
              />
              <small>Example: road, water, waste</small>
            </div>
            <div>
              <label>Coverage Zones (comma separated)</label>
              <input
                value={form.coverage_zones}
                onChange={(e) =>
                  setForm({ ...form, coverage_zones: e.target.value })
                }
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                  width: "100%",
                }}
                readOnly
              />
              <small>
                🗺️ Click map below to set location (auto-fills zone)
              </small>
            </div>
          </div>

          {/* Map for selecting agent location */}
          <div style={{ marginTop: "1rem" }}>
            <label>📍 Click Map to Set Agent Base Location</label>
            <div
              style={{
                height: "300px",
                border: "2px solid black",
                borderRadius: "6px",
                marginTop: "0.5rem",
              }}
            >
              <MapContainer
                center={agentPosition}
                zoom={13}
                style={{ height: "100%", width: "100%", borderRadius: "6px" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <AgentLocationMarker
                  position={agentPosition}
                  setPosition={setAgentPosition}
                  setZone={setZoneFromMap}
                />
              </MapContainer>
            </div>
            <small style={{ display: "block", marginTop: "0.5rem" }}>
              Current zone: <strong>{form.coverage_zones}</strong> |
              Coordinates: {agentPosition[0].toFixed(4)},{" "}
              {agentPosition[1].toFixed(4)}
            </small>
          </div>

          <h3 style={{ marginTop: "1rem" }}>Schedule (Mon-Fri)</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "0.5rem",
            }}
          >
            {Object.keys(form.schedule).map((day) => (
              <div
                key={day}
                style={{
                  border: "2px solid black",
                  padding: "0.5rem",
                  borderRadius: "6px",
                }}
              >
                <strong>{day}</strong>
                <div
                  style={{
                    display: "flex",
                    gap: "0.25rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <input
                    value={form.schedule[day].start}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        schedule: {
                          ...form.schedule,
                          [day]: {
                            ...form.schedule[day],
                            start: e.target.value,
                          },
                        },
                      })
                    }
                    style={{
                      padding: "1rem 1.25rem",
                      border: "2px solid black",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      backgroundColor: "white",
                      color: "black",
                      width: "100%",
                    }}
                  />
                  <input
                    value={form.schedule[day].end}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        schedule: {
                          ...form.schedule,
                          [day]: { ...form.schedule[day], end: e.target.value },
                        },
                      })
                    }
                    style={{
                      padding: "1rem 1.25rem",
                      border: "2px solid black",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      backgroundColor: "white",
                      color: "black",
                      width: "100%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            style={{
              padding: "1rem 2rem",
              border: "2px solid black",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "white",
              color: "black",
              fontWeight: "500",
              transition: "all 0.3s",
              marginTop: "1rem",
            }}
          >
            Create Agent
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Agents</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : agents.length === 0 ? (
          <div>No agents found</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {agents.map((a) => (
              <div
                key={a._id}
                style={{
                  border: "2px solid black",
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>{a.name}</h3>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {a.type}
                  </span>
                </div>
                <div>
                  <strong>Skills:</strong>{" "}
                  {Array.isArray(a.skills) ? a.skills.join(", ") : "-"}
                </div>
                <div>
                  <strong>Zones:</strong>{" "}
                  {Array.isArray(a.coverage_zones)
                    ? a.coverage_zones.join(", ")
                    : "-"}
                </div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    display: "flex",
                    gap: "0.5rem",
                  }}
                >
                  <Link
                    to={`/agents/${a._id}`}
                    className="btn btn-primary"
                    style={{
                      padding: "0.5rem 1rem",
                      border: "2px solid black",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: "white",
                      color: "black",
                      fontWeight: "500",
                      transition: "all 0.3s",
                      display: "inline-block",
                      textDecoration: "none",
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    View
                  </Link>
                  <button
                    onClick={() => deleteAgent(a._id, a.name)}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "2px solid #dc2626",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: "#dc2626",
                      color: "white",
                      fontWeight: "500",
                      transition: "all 0.3s",
                      flex: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#b91c1c";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#dc2626";
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Agents;
