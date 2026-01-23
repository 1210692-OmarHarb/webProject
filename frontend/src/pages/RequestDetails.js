import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { requestsAPI } from "../services/api";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = "http://localhost:8000";

function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const citizenIdFromUrl = searchParams.get("citizenId");

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [activeCitizen, setActiveCitizen] = useState(null);

  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState({
    stars: 5,
    reason_code: "",
    comment: "",
  });
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [failedImages, setFailedImages] = useState(new Set());
  const fileInputRef = useRef(null);
  const staffKeyPresent = !!localStorage.getItem("staffKey");
  const agentIdPresent = !!localStorage.getItem("agentId");

  useEffect(() => {
    fetchRequest();
    fetchComments();
    fetchRating();

    if (citizenIdFromUrl) {
      fetchActiveCitizen();
    }
  }, [id, citizenIdFromUrl]);

  const fetchActiveCitizen = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/citizens/${citizenIdFromUrl}`,
      );
      setActiveCitizen(response.data);
    } catch (err) {
      console.error("Failed to load citizen:", err);
    }
  };

  const fetchRequest = async () => {
    try {
      const response = await requestsAPI.getById(id);
      setRequest(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/agents/`);
      setAgents(response.data || []);
    } catch (err) {
      console.error("Failed to load agents:", err);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/requests/${id}/comments`,
      );
      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const fetchRating = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/${id}/rating`);
      if (response.data._id) {
        setRating(response.data);
      }
    } catch (err) {
      console.error("No rating found");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      let citizenId = activeCitizen?._id || request.citizen_ref?.citizen_id;
      let citizenName =
        activeCitizen?.full_name ||
        request.citizen_ref?.full_name ||
        "Anonymous";

      if (!citizenId) {
        const citizensRes = await axios.get(`${API_BASE_URL}/citizens/`);
        const citizen = citizensRes.data[0];
        citizenId = citizen._id;
        citizenName = citizen.full_name;
      }

      await axios.post(`${API_BASE_URL}/requests/${id}/comment`, {
        author_id: citizenId,
        author_type: "citizen",
        content: newComment,
      });

      setNewComment("");
      fetchComments();
      alert("Comment added successfully!");
    } catch (err) {
      alert(
        "Failed to add comment: " + (err.response?.data?.detail || err.message),
      );
    }
  };

  const handleAddRating = async () => {
    try {
      let citizenId = activeCitizen?._id || request.citizen_ref?.citizen_id;

      if (!citizenId) {
        const citizensRes = await axios.get(`${API_BASE_URL}/citizens/`);
        const citizen = citizensRes.data[0];
        citizenId = citizen._id;
      }

      await axios.post(`${API_BASE_URL}/requests/${id}/rating`, {
        citizen_id: citizenId,
        stars: parseInt(newRating.stars),
        reason_code: newRating.reason_code,
        comment: newRating.comment,
      });

      fetchRating();
      setShowRating(false);
      alert("Rating submitted successfully!");
    } catch (err) {
      alert(
        "Failed to submit rating: " +
          (err.response?.data?.detail || err.message),
      );
    }
  };

  const handleAddEvidence = async () => {
    if (!evidenceUrl.trim()) return;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/requests/${id}/evidence`,
        {
          type: "photo",
          url: evidenceUrl,
          uploaded_by: "citizen",
        },
      );

      setEvidenceUrl("");

      await fetchRequest();

      alert("Evidence added successfully! The image should now appear below.");
    } catch (err) {
      alert(
        "Failed to add evidence: " +
          (err.response?.data?.detail || err.message),
      );
    }
  };

  const handleUploadEvidenceFile = async () => {
    if (!evidenceFile) return;
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", evidenceFile);
      formData.append("uploaded_by", activeCitizen?.full_name || "citizen");
      formData.append("evidence_type", "photo");

      await axios.post(
        `${API_BASE_URL}/requests/${id}/evidence/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setEvidenceFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchRequest();
      alert("File uploaded successfully! The image should now appear below.");
    } catch (err) {
      alert(
        "Failed to upload file: " + (err.response?.data?.detail || err.message),
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const staffKey = localStorage.getItem("staffKey");
      const response = await axios.patch(
        `${API_BASE_URL}/requests/${id}/transition`,
        {
          new_state: newStatus,
          actor_type: "staff",
          actor_id: staffKey ? "staff-user" : "system",
        },
        {
          headers: staffKey ? { "X-Staff-Key": staffKey } : {},
        },
      );
      await fetchRequest();
      alert(
        "Status updated to: " +
          newStatus +
          "\n" +
          (response.data?.message || ""),
      );
    } catch (err) {
      alert(
        "Failed to update status: " +
          (err.response?.data?.detail || err.message),
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this request?")) {
      try {
        await requestsAPI.delete(id);
        alert("Request deleted successfully!");
        navigate("/requests");
      } catch (err) {
        alert("Failed to delete request");
      }
    }
  };

  const handleAutoAssign = async () => {
    try {
      setAssigning(true);
      await requestsAPI.autoAssign(id);
      await fetchRequest();
      alert("Auto-assignment completed");
    } catch (err) {
      alert(
        "Auto-assign failed: " +
          (err.response?.data?.detail || err.message) +
          "\nHint: set Staff Key in Agents page.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedAgentId) {
      alert("Please select an agent");
      return;
    }
    try {
      setAssigning(true);
      const staffKey = localStorage.getItem("staffKey");
      await axios.post(
        `${API_BASE_URL}/requests/${id}/assign`,
        { agent_id: selectedAgentId },
        { headers: { "X-Staff-Key": staffKey } },
      );
      await fetchRequest();
      setShowAssignPanel(false);
      alert("Request assigned successfully");
    } catch (err) {
      alert(
        "Assignment failed: " +
          (err.response?.data?.detail || err.message) +
          "\nHint: set Staff Key in Agents page.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const sendMilestone = async (type) => {
    try {
      await requestsAPI.addMilestone(id, { type });
      await fetchRequest();
      alert("Milestone recorded: " + type);
    } catch (err) {
      alert(
        "Milestone failed: " +
          (err.response?.data?.detail || err.message) +
          "\nHint: set Agent Id in Agents page and ensure agent is assigned.",
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  if (!request)
    return (
      <div className="container">
        <div className="error">Request not found</div>
      </div>
    );

  const position = [
    request.location.coordinates[1],
    request.location.coordinates[0],
  ];

  return (
    <div className="container">
      {/* Active Citizen Banner */}
      {activeCitizen && (
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            padding: "1rem 1.5rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              Citizen
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                Viewing as: {activeCitizen.full_name}
              </div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                You can add comments and evidence as this citizen
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/citizens/${activeCitizen._id}`)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "2px solid white",
              color: "white",
              padding: "1rem 2rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            View Profile
          </button>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: "1rem",
          }}
        >
          <h1>{request.title}</h1>
          <span className={`status-badge status-${request.status}`}>
            {request.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h3>Description</h3>
          <p>{request.description}</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h3>Details</h3>
            <p>
              <strong>Category:</strong> {request.category}
            </p>
            <p>
              <strong>Address:</strong> {request.address}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {formatDate(request.timestamps?.created_at || request.created_at)}
            </p>
            <p>
              <strong>Last Updated:</strong>{" "}
              {formatDate(request.timestamps?.updated_at || request.updated_at)}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h3>Location</h3>
          <div className="map-container">
            <MapContainer
              center={position}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={position}>
                <Popup>{request.title}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "2rem",
            paddingTop: "1rem",
            borderTop: "2px solid #e5e7eb",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => navigate("/requests")}
          >
            ← Back to List
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete Request
          </button>

          {/* Prominent action buttons */}
          <button
            style={{
              background: showComments ? "#3b82f6" : "#f3f4f6",
              color: showComments ? "white" : "#1f2937",
              padding: "1rem 2rem",
              borderRadius: "6px",
              border: showComments ? "2px solid black" : "2px solid black",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
            }}
            onClick={() => setShowComments(!showComments)}
          >
            Comments ({comments.length})
          </button>

          <button
            style={{
              background: showEvidence ? "#10b981" : "#f3f4f6",
              color: showEvidence ? "white" : "#1f2937",
              padding: "1rem 2rem",
              borderRadius: "6px",
              border: showEvidence ? "2px solid black" : "2px solid black",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
            }}
            onClick={() => setShowEvidence(!showEvidence)}
          >
            📎 Add Evidence
          </button>

          {(request.status === "resolved" || request.status === "closed") &&
            !rating && (
              <button
                style={{
                  background: showRating ? "#f59e0b" : "#f3f4f6",
                  color: showRating ? "white" : "#1f2937",
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: showRating ? "2px solid black" : "2px solid black",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
                onClick={() => setShowRating(!showRating)}
              >
                ⭐ Rate Service
              </button>
            )}

          {staffKeyPresent && !request.assignment?.assigned_agent_id && (
            <button
              style={{
                background: "#3b82f6",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "2px solid black",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "1rem",
              }}
              onClick={() => {
                setShowAssignPanel(!showAssignPanel);
                if (!showAssignPanel) fetchAgents();
              }}
            >
              👤 Assign to Agent
            </button>
          )}

          {request.assignment?.assigned_agent_id && (
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <span style={{ color: "#6b7280" }}>Assigned Agent:</span>
              <code>{request.assignment.assigned_agent_id}</code>
              <div
                style={{ marginLeft: "1rem", display: "flex", gap: "0.5rem" }}
              >
                <button
                  onClick={() => sendMilestone("arrived")}
                  className="btn"
                >
                  Arrived
                </button>
                <button
                  onClick={() => sendMilestone("work_started")}
                  className="btn"
                >
                  Work Started
                </button>
                <button
                  onClick={() => sendMilestone("resolved")}
                  className="btn btn-success"
                >
                  Resolved
                </button>
              </div>
              {!agentIdPresent && (
                <span style={{ color: "#b91c1c", marginLeft: "0.5rem" }}>
                  (Set Agent Id in Agents page)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Assignment Panel */}
      {showAssignPanel && (
        <div
          className="card"
          style={{ marginTop: "1rem", border: "2px solid #3b82f6" }}
        >
          <h2 style={{ color: "#3b82f6", marginBottom: "1rem" }}>
            Assign Request to Agent
          </h2>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Select Agent:
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid black",
                borderRadius: "6px",
                fontSize: "1rem",
                backgroundColor: "white",
              }}
            >
              <option value="">-- Choose an agent --</option>
              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>
                  {agent.name} - {agent.type} (Skills:{" "}
                  {agent.skills?.join(", ")}) - Zones:{" "}
                  {agent.coverage_zones?.join(", ")}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleManualAssign}
              disabled={assigning || !selectedAgentId}
              style={{
                padding: "0.75rem 1.5rem",
                border: "2px solid black",
                borderRadius: "6px",
                backgroundColor: "#3b82f6",
                color: "white",
                fontWeight: "600",
                cursor: selectedAgentId ? "pointer" : "not-allowed",
                opacity: selectedAgentId ? 1 : 0.5,
              }}
            >
              {assigning ? "Assigning..." : "Assign"}
            </button>
            <button
              onClick={() => setShowAssignPanel(false)}
              style={{
                padding: "0.75rem 1.5rem",
                border: "2px solid black",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "black",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div
          className="card"
          style={{ marginTop: "1rem", border: "2px solid black" }}
        >
          <h2 style={{ color: "#3b82f6", marginBottom: "1.5rem" }}>
            Comments & Discussion
          </h2>

          {activeCitizen && (
            <div
              style={{
                background: "#dbeafe",
                border: "2px solid black",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "#1e40af",
              }}
            >
              <strong>Commenting as:</strong> {activeCitizen.full_name} ✓
            </div>
          )}

          {/* Add Comment Form */}
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1.5rem",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "2px solid black",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              Add Your Comment
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts, ask questions, or provide updates..."
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                minHeight: "100px",
                marginBottom: "0.75rem",
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              style={{
                background: newComment.trim() ? "#3b82f6" : "#9ca3af",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "none",
                cursor: newComment.trim() ? "pointer" : "not-allowed",
                fontWeight: "600",
                fontSize: "1rem",
              }}
            >
              📤 Post Comment
            </button>
          </div>

          {/* Comments List */}
          <div>
            {comments.length === 0 ? (
              <p style={{ color: "#6b7280", textAlign: "center" }}>
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment._id}
                  style={{
                    padding: "1rem",
                    marginBottom: "1rem",
                    background: comment.is_internal ? "#fef3c7" : "white",
                    border: "2px solid black",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong>{comment.author_name}</strong>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{comment.content}</p>
                  {comment.is_internal && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "0.5rem",
                        padding: "0.25rem 0.5rem",
                        background: "#fbbf24",
                        color: "white",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                      }}
                    >
                      Internal Note
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rating Section */}
      {rating && (
        <div
          className="card"
          style={{ marginTop: "1rem", background: "#fef3c7" }}
        >
          <h2>⭐ Service Rating</h2>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: "2rem" }}>
              {"⭐".repeat(rating.stars)}
              {"☆".repeat(5 - rating.stars)}
            </div>
            <div>
              <div>
                <strong>Rating:</strong> {rating.stars}/5
              </div>
              {rating.reason_code && (
                <div>
                  <strong>Reason:</strong>{" "}
                  {rating.reason_code.replace("_", " ")}
                </div>
              )}
            </div>
          </div>
          {rating.comment && (
            <div
              style={{
                padding: "1rem",
                background: "white",
                borderRadius: "6px",
              }}
            >
              <strong>Comment:</strong>
              <p style={{ margin: "0.5rem 0 0 0" }}>{rating.comment}</p>
            </div>
          )}
          {rating.dispute_flag && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#fee2e2",
                border: "2px solid black",
                borderRadius: "6px",
                color: "#991b1b",
              }}
            >
              <strong>⚠️ Disputed:</strong>{" "}
              {rating.dispute_reason || "Rating disputed by citizen"}
            </div>
          )}
        </div>
      )}

      {/* Rating Form */}
      {showRating && !rating && (
        <div
          className="card"
          style={{ marginTop: "1rem", border: "2px solid black" }}
        >
          <h2 style={{ color: "#f59e0b", marginBottom: "1.5rem" }}>
            ⭐ Rate This Service
          </h2>

          {activeCitizen && (
            <div
              style={{
                background: "#fef3c7",
                border: "2px solid black",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "#92400e",
              }}
            >
              <strong>Rating as:</strong> {activeCitizen.full_name} ✓
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Rating (Stars)
            </label>
            <select
              value={newRating.stars}
              onChange={(e) =>
                setNewRating({ ...newRating, stars: e.target.value })
              }
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                width: "100%",
                fontSize: "1rem",
              }}
            >
              <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
              <option value="4">⭐⭐⭐⭐ Good</option>
              <option value="3">⭐⭐⭐ Average</option>
              <option value="2">⭐⭐ Poor</option>
              <option value="1">⭐ Very Poor</option>
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Reason
            </label>
            <select
              value={newRating.reason_code}
              onChange={(e) =>
                setNewRating({ ...newRating, reason_code: e.target.value })
              }
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                width: "100%",
                fontSize: "1rem",
              }}
            >
              <option value="">Select reason (optional)</option>
              <option value="excellent_service">Excellent Service</option>
              <option value="quick_resolution">Quick Resolution</option>
              <option value="poor_quality">Poor Quality</option>
              <option value="incomplete">Incomplete Work</option>
            </select>
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
              }}
            >
              Comment (Optional)
            </label>
            <textarea
              value={newRating.comment}
              onChange={(e) =>
                setNewRating({ ...newRating, comment: e.target.value })
              }
              placeholder="Share your feedback..."
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                minHeight: "100px",
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={handleAddRating}
              style={{
                background: "#f59e0b",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "1rem",
              }}
            >
              ⭐ Submit Rating
            </button>
            <button
              onClick={() => setShowRating(false)}
              style={{
                background: "white",
                color: "#6b7280",
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "2px solid black",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Evidence Upload Section */}
      {showEvidence && (
        <div
          className="card"
          style={{ marginTop: "1rem", border: "2px solid black" }}
        >
          <h2 style={{ color: "#10b981", marginBottom: "1.5rem" }}>
            📎 Upload Evidence
          </h2>

          {activeCitizen && (
            <div
              style={{
                background: "#d1fae5",
                border: "2px solid black",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "#065f46",
              }}
            >
              <strong>Uploading as:</strong> {activeCitizen.full_name} ✓
            </div>
          )}

          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1.5rem",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "2px solid black",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              Evidence URL (Photo, Video, or Document)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://imgur.com/abc123.jpg or https://example.com/photo.png"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
                marginBottom: "0.75rem",
              }}
            />
            <div
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "1rem",
                padding: "0.75rem",
                background: "#f3f4f6",
                borderRadius: "6px",
              }}
            >
              <strong>Tip:</strong> Use direct image links (ends with .jpg,
              .png, .gif) or imgur links. Example: https://imgur.com/abc123.jpg
              or https://i.imgur.com/abc123.jpg
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleAddEvidence}
                disabled={!evidenceUrl.trim()}
                style={{
                  background: evidenceUrl.trim() ? "#10b981" : "#9ca3af",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: evidenceUrl.trim() ? "pointer" : "not-allowed",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
              >
                📤 Upload Evidence
              </button>
              <button
                onClick={() => setShowEvidence(false)}
                style={{
                  background: "white",
                  color: "#6b7280",
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: "2px solid black",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1.5rem",
              background: "#ecfdf3",
              borderRadius: "8px",
              border: "2px solid black",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                color: "#065f46",
              }}
            >
              Upload a File (images work best)
            </label>
            <input
              key={uploadingFile ? "uploading" : "ready"}
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                border: "2px solid black",
                background: "white",
                marginBottom: "0.75rem",
              }}
            />
            {evidenceFile && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#065f46",
                  marginBottom: "0.75rem",
                }}
              >
                Selected: {evidenceFile.name} (
                {(evidenceFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleUploadEvidenceFile}
                disabled={!evidenceFile || uploadingFile}
                style={{
                  background:
                    evidenceFile && !uploadingFile ? "#10b981" : "#9ca3af",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor:
                    evidenceFile && !uploadingFile ? "pointer" : "not-allowed",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
              >
                {uploadingFile ? "Uploading..." : "📤 Upload File"}
              </button>
            </div>
          </div>

          {/* Display Existing Evidence */}
          {request.evidence && request.evidence.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h3>Existing Evidence</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                {request.evidence.map((ev, idx) => {
                  const hasImageError = failedImages.has(idx);
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "0",
                        background: "#f9fafb",
                        border: "2px solid black",
                        borderRadius: "8px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {ev.type === "photo" && !hasImageError && (
                        <div
                          style={{
                            width: "100%",
                            height: "200px",
                            background: "#e5e7eb",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              color: "#9ca3af",
                              fontSize: "2rem",
                              zIndex: 1,
                            }}
                          >
                            📷 Loading...
                          </div>
                          <img
                            src={ev.url}
                            alt={`Evidence ${idx + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onLoad={() =>
                              console.log(`Image loaded: ${ev.url}`)
                            }
                            onError={(e) => {
                              console.error(
                                `Image failed to load: ${ev.url}`,
                                e,
                              );
                              setFailedImages(
                                (prev) => new Set([...prev, idx]),
                              );
                            }}
                          />
                        </div>
                      )}
                      {(ev.type !== "photo" || hasImageError) && (
                        <div
                          style={{
                            padding: "2rem 1rem",
                            textAlign: "center",
                            color: "#1f2937",
                            fontSize: "1rem",
                            background: "#fef3c7",
                            minHeight: "100px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px dashed #f59e0b",
                          }}
                        >
                          {hasImageError ? (
                            <div>
                              <div
                                style={{
                                  fontSize: "1.5rem",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                ⚠️ Image Failed to Load
                              </div>
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  marginBottom: "0.75rem",
                                }}
                              >
                                Possible reasons:
                              </div>
                              <ul
                                style={{
                                  textAlign: "left",
                                  fontSize: "0.85rem",
                                  margin: "0.5rem 0",
                                  paddingLeft: "1.5rem",
                                }}
                              >
                                <li>URL is not a direct image link</li>
                                <li>Server is blocking the image (CORS)</li>
                                <li>Image URL is expired or invalid</li>
                              </ul>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  fontSize: "2rem",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                📄
                              </div>
                              <div>{ev.type} file</div>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ padding: "1rem", background: "white" }}>
                        <div
                          style={{ fontWeight: "600", marginBottom: "0.5rem" }}
                        >
                          {ev.type === "photo"
                            ? "📷"
                            : ev.type === "video"
                              ? "🎥"
                              : "📄"}{" "}
                          {ev.type}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#3b82f6",
                            wordBreak: "break-all",
                            marginBottom: "0.5rem",
                            padding: "0.5rem",
                            background: "#dbeafe",
                            borderRadius: "4px",
                            maxHeight: "60px",
                            overflow: "auto",
                          }}
                        >
                          <strong>URL:</strong> {ev.url}
                        </div>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            fontSize: "0.875rem",
                            textDecoration: "underline",
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Open in new tab
                        </a>
                        {ev.uploaded_by && (
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            By: {ev.uploaded_by}
                          </div>
                        )}
                        {ev.uploaded_at && (
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {new Date(ev.uploaded_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RequestDetails;
