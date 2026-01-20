import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { requestsAPI } from "../services/api";
import "leaflet/dist/leaflet.css";

function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

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

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await requestsAPI.updateStatus(id, newStatus);
      await fetchRequest();
      alert("Status updated successfully!");
    } catch (err) {
      alert("Failed to update status");
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
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
              <strong>Created:</strong> {formatDate(request.created_at)}
            </p>
            <p>
              <strong>Last Updated:</strong> {formatDate(request.updated_at)}
            </p>
          </div>

          <div>
            <h3>Update Status</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => handleStatusUpdate("pending")}
                disabled={updating || request.status === "pending"}
              >
                Mark as Pending
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleStatusUpdate("in_progress")}
                disabled={updating || request.status === "in_progress"}
              >
                Mark as In Progress
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleStatusUpdate("resolved")}
                disabled={updating || request.status === "resolved"}
              >
                Mark as Resolved
              </button>
            </div>
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

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/requests")}
          >
            Back to List
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestDetails;
