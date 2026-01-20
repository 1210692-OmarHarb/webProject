import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { agentsAPI } from "../services/api";

function AgentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await agentsAPI.getById(id);
        setData(res.data);
        setError("");
      } catch (err) {
        setError("Failed to load agent");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>;
  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!data) return null;

  const { agent, metrics } = data;

  return (
    <div className="container">
      <div className="card">
        <h1>{agent.name}</h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <div>
            <p><strong>Type:</strong> {agent.type}</p>
            <p><strong>Skills:</strong> {agent.skills?.join(", ") || "-"}</p>
            <p><strong>Coverage Zones:</strong> {agent.coverage_zones?.join(", ") || "-"}</p>
          </div>
          <div>
            <h3>Performance</h3>
            <p><strong>Open Workload:</strong> {metrics?.workload_open ?? 0}</p>
            <div>
              <strong>Event Counts:</strong>
              <ul>
                {metrics?.performance && Object.entries(metrics.performance).map(([k,v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
                {!metrics?.performance && <li>No data</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentDetail;
