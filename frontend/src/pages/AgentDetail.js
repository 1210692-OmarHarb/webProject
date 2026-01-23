import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { agentsAPI } from "../services/api";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

function AgentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [updating, setUpdating] = useState(false);

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
    fetchTickets();
  }, [id]);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/`, {
        params: { agent_id: id },
      });
      setTickets(response.data || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const updateTicketStatus = async (requestId, newStatus) => {
    try {
      setUpdating(true);
      const agentId = localStorage.getItem("agentId");
      await axios.patch(
        `${API_BASE_URL}/requests/${requestId}/status`,
        { status: newStatus },
        { headers: { "X-Agent-Id": agentId } },
      );
      await fetchTickets();
      alert(`Ticket updated to ${newStatus}`);
    } catch (err) {
      alert(
        "Failed to update ticket: " +
          (err.response?.data?.detail || err.message),
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  if (!data) return null;

  const { agent, metrics } = data;

  return (
    <div className="container">
      <div className="card">
        <h1>{agent.name}</h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <p>
              <strong>Type:</strong> {agent.type}
            </p>
            <p>
              <strong>Skills:</strong> {agent.skills?.join(", ") || "-"}
            </p>
            <p>
              <strong>Coverage Zones:</strong>{" "}
              {agent.coverage_zones?.join(", ") || "-"}
            </p>
          </div>
          <div>
            <h3>Performance</h3>
            <p>
              <strong>Open Workload:</strong> {metrics?.workload_open ?? 0}
            </p>
            <div>
              <strong>Event Counts:</strong>
              <ul>
                {metrics?.performance &&
                  Object.entries(metrics.performance).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                {!metrics?.performance && <li>No data</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tickets Table */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Assigned Tickets</h2>
        {loadingTickets ? (
          <div>Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div>No tickets assigned to this agent</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderBottom: "2px solid black",
                  }}
                >
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    Priority
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      border: "1px solid black",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <Link
                        to={`/requests/${ticket._id}`}
                        style={{ color: "#3b82f6", textDecoration: "none" }}
                      >
                        {ticket._id.slice(-6)}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {ticket.title}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {ticket.category}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          backgroundColor:
                            ticket.status === "resolved"
                              ? "#d1fae5"
                              : ticket.status === "in_progress"
                                ? "#fef3c7"
                                : ticket.status === "assigned"
                                  ? "#dbeafe"
                                  : "#f3f4f6",
                          color:
                            ticket.status === "resolved"
                              ? "#065f46"
                              : ticket.status === "in_progress"
                                ? "#92400e"
                                : ticket.status === "assigned"
                                  ? "#1e40af"
                                  : "#374151",
                        }}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {ticket.priority || "medium"}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {ticket.status === "assigned" && (
                          <button
                            onClick={() =>
                              updateTicketStatus(ticket._id, "in_progress")
                            }
                            disabled={updating}
                            style={{
                              padding: "0.4rem 0.8rem",
                              border: "2px solid #f59e0b",
                              borderRadius: "4px",
                              backgroundColor: "#fbbf24",
                              color: "white",
                              fontWeight: "600",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            Start Work
                          </button>
                        )}
                        {(ticket.status === "assigned" ||
                          ticket.status === "in_progress") && (
                          <button
                            onClick={() =>
                              updateTicketStatus(ticket._id, "resolved")
                            }
                            disabled={updating}
                            style={{
                              padding: "0.4rem 0.8rem",
                              border: "2px solid #10b981",
                              borderRadius: "4px",
                              backgroundColor: "#10b981",
                              color: "white",
                              fontWeight: "600",
                              fontSize: "0.875rem",
                              cursor: "pointer",
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDetail;
