import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { agentsAPI } from "../services/api";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  const [staffKey, setStaffKey] = useState(localStorage.getItem("staffKey") || "");
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

  useEffect(() => { load(); }, []);

  const saveKeys = () => {
    localStorage.setItem("staffKey", staffKey);
    localStorage.setItem("agentId", agentId);
    alert("Keys saved to browser (localStorage)");
  };

  const createAgent = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        type: form.type,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        coverage_zones: form.coverage_zones.split(",").map(z => z.trim()).filter(Boolean),
        schedule: Object.entries(form.schedule).map(([day, v]) => ({ day, start: v.start, end: v.end }))
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Staff Key (for admin actions)</label>
            <input value={staffKey} onChange={(e)=>setStaffKey(e.target.value)} placeholder="STAFF_API_KEY" style={{ width:"100%" }} />
          </div>
          <div>
            <label>Agent Id (for milestone actions)</label>
            <input value={agentId} onChange={(e)=>setAgentId(e.target.value)} placeholder="ObjectId of agent" style={{ width:"100%" }} />
          </div>
        </div>
        <button onClick={saveKeys} className="btn btn-primary" style={{ marginTop: "0.75rem" }}>Save Keys</button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2>Create Agent/Team</h2>
        <form onSubmit={createAgent}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
            <div>
              <label>Name</label>
              <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} required style={{ width:"100%" }} />
            </div>
            <div>
              <label>Type</label>
              <select value={form.type} onChange={(e)=>setForm({ ...form, type: e.target.value })} style={{ width:"100%" }}>
                <option value="agent">Agent</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div>
              <label>Skills (comma separated)</label>
              <input value={form.skills} onChange={(e)=>setForm({ ...form, skills: e.target.value })} style={{ width:"100%" }} />
              <small>Example: road, water, waste</small>
            </div>
            <div>
              <label>Coverage Zones (comma separated)</label>
              <input value={form.coverage_zones} onChange={(e)=>setForm({ ...form, coverage_zones: e.target.value })} style={{ width:"100%" }} />
              <small>Example: ZONE-DT-01, ZONE-N-03</small>
            </div>
          </div>

          <h3 style={{ marginTop: "1rem" }}>Schedule (Mon-Fri)</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"0.5rem" }}>
            {Object.keys(form.schedule).map(day => (
              <div key={day} style={{ border:"1px solid #e5e7eb", padding:"0.5rem", borderRadius:"6px" }}>
                <strong>{day}</strong>
                <div style={{ display:"flex", gap:"0.25rem", marginTop:"0.25rem" }}>
                  <input value={form.schedule[day].start} onChange={(e)=>setForm({ ...form, schedule: { ...form.schedule, [day]: { ...form.schedule[day], start: e.target.value }}})} style={{ width:"100%" }} />
                  <input value={form.schedule[day].end} onChange={(e)=>setForm({ ...form, schedule: { ...form.schedule, [day]: { ...form.schedule[day], end: e.target.value }}})} style={{ width:"100%" }} />
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-success" style={{ marginTop: "1rem" }}>Create Agent</button>
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
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"1rem" }}>
            {agents.map(a => (
              <div key={a._id} style={{ border:"1px solid #e5e7eb", borderRadius:"8px", padding:"1rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <h3 style={{ margin:"0 0 0.5rem 0" }}>{a.name}</h3>
                  <span style={{ fontSize:"0.8rem", color:"#6b7280" }}>{a.type}</span>
                </div>
                <div><strong>Skills:</strong> {Array.isArray(a.skills) ? a.skills.join(", ") : "-"}</div>
                <div><strong>Zones:</strong> {Array.isArray(a.coverage_zones) ? a.coverage_zones.join(", ") : "-"}</div>
                <Link to={`/agents/${a._id}`} className="btn btn-primary" style={{ marginTop:"0.5rem", display:"inline-block" }}>View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Agents;
