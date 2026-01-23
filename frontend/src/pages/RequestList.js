import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { requestsAPI, categoriesAPI } from "../services/api";

function RequestList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
  });

  const statuses = ["pending", "in_progress", "resolved"];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        setCategories(response.data || []);
        setLoadingCategories(false);
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategories([
          { _id: "1", name: "Pothole" },
          { _id: "2", name: "Streetlight" },
          { _id: "3", name: "Garbage Collection" },
          { _id: "4", name: "Water Supply" },
          { _id: "5", name: "Traffic Signal" },
          { _id: "6", name: "Park Maintenance" },
        ]);
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;

      const response = await requestsAPI.getAll(params);
      setRequests(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading)
    return (
      <div className="container">
        <div className="loading">Loading requests...</div>
      </div>
    );

  return (
    <div className="container">
      <div className="card">
        <h1>Service Requests</h1>

        {error && <div className="error">{error}</div>}

        <div className="filters">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              style={{
                padding: "1rem 1.25rem",
                border: "2px solid black",
                borderRadius: "6px",
                fontSize: "1rem",
                backgroundColor: "white",
                color: "black",
                cursor: "pointer",
              }}
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Category:</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={loadingCategories}
              style={{
                padding: "1rem 1.25rem",
                border: "2px solid black",
                borderRadius: "6px",
                fontSize: "1rem",
                backgroundColor: "white",
                color: "black",
                cursor: "pointer",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => {
                const catName = typeof cat === "string" ? cat : cat.name;
                const catId = typeof cat === "string" ? cat : cat._id;
                return (
                  <option key={catId} value={catName}>
                    {catName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {requests.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#7f8c8d" }}>
            No requests found
          </p>
        ) : (
          <div>
            {requests.map((request) => (
              <div
                key={request._id}
                className="request-card"
                onClick={() => navigate(`/requests/${request._id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3>{request.title}</h3>
                    <p>{request.description.substring(0, 100)}...</p>
                    <p>
                      <strong>Category:</strong> {request.category}
                    </p>
                    <p>
                      <strong>Address:</strong> {request.address}
                    </p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {formatDate(
                        request.timestamps?.created_at || request.created_at,
                      )}
                    </p>
                  </div>
                  <span className={`status-badge status-${request.status}`}>
                    {request.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestList;
