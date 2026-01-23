import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_BASE_URL = "http://localhost:8000";

function CitizenProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [citizen, setCitizen] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpData, setOtpData] = useState(null);

  useEffect(() => {
    fetchCitizenData();
  }, [id]);

  const fetchCitizenData = async () => {
    try {
      setLoading(true);
      const [citizenRes, statsRes, requestsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/citizens/${id}`),
        axios.get(`${API_BASE_URL}/citizens/${id}/statistics`),
        axios.get(`${API_BASE_URL}/citizens/${id}/requests`),
      ]);

      setCitizen(citizenRes.data);
      setStatistics(statsRes.data);
      setRequests(requestsRes.data.requests || []);
      setFormData(citizenRes.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch citizen data: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const requestOTP = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/citizens/${id}/request-verification`,
      );
      setOtpData(response.data);
      setVerifying(true);
      alert(`OTP sent! For testing: ${response.data.otp_stub}`);
    } catch (err) {
      alert("Failed to request OTP: " + err.message);
    }
  };

  const verifyOTP = async () => {
    try {
      await axios.post(`${API_BASE_URL}/citizens/${id}/verify`, { otp });
      alert("Verified successfully!");
      setVerifying(false);
      setOtp("");
      fetchCitizenData();
    } catch (err) {
      alert(
        "Verification failed: " + (err.response?.data?.detail || err.message),
      );
    }
  };

  const handleUpdateCitizen = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        neighborhood: formData.neighborhood,
        city: formData.city,
        zone_id: formData.zone_id,
        verification_state: formData.verification_state,
      };

      await axios.patch(`${API_BASE_URL}/citizens/${id}`, updates);
      setEditing(false);
      fetchCitizenData();
      alert("Citizen profile updated successfully!");
    } catch (err) {
      alert("Failed to update citizen: " + err.message);
    }
  };

  const handleDeleteCitizen = async () => {
    if (
      window.confirm("Are you sure you want to delete this citizen profile?")
    ) {
      try {
        await axios.delete(`${API_BASE_URL}/citizens/${id}`);
        alert("Citizen deleted successfully!");
        navigate("/citizens");
      } catch (err) {
        alert("Failed to delete citizen: " + err.message);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: "#3b82f6",
      triaged: "#f59e0b",
      assigned: "#8b5cf6",
      in_progress: "#06b6d4",
      resolved: "#10b981",
      closed: "#6b7280",
    };
    return colors[status] || "#6b7280";
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Loading Citizen Profile...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
        <Link to="/citizens" className="btn-primary">
          Back to Citizens
        </Link>
      </div>
    );
  }

  if (!citizen) {
    return (
      <div className="container">
        <h1>Citizen Not Found</h1>
        <Link to="/citizens" className="btn-primary">
          Back to Citizens
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to="/citizens"
          style={{
            color: "#3b82f6",
            textDecoration: "none",
            marginBottom: "1rem",
            display: "inline-block",
          }}
        >
          ← Back to Citizens
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>Citizen Profile</h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {/* Submit Report Button - Prominent */}
            <Link to={`/create?citizenId=${id}`}>
              <button
                style={{
                  background: "#10b981",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
                }}
              >
                Submit Report as {citizen.full_name}
              </button>
            </Link>

            {/* Verification Status Badge */}
            <span
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                fontSize: "0.875rem",
                fontWeight: "600",
                background:
                  citizen.verification_state === "verified"
                    ? "#10b981"
                    : citizen.verification_state === "pending"
                      ? "#f59e0b"
                      : "#6b7280",
                color: "white",
              }}
            >
              {citizen.verification_state === "verified"
                ? "✓ Verified"
                : citizen.verification_state === "pending"
                  ? "⏳ Pending"
                  : "❌ Unverified"}
            </span>

            {/* Verification Button */}
            {citizen.verification_state !== "verified" && !verifying && (
              <>
                <button onClick={requestOTP} className="btn-primary">
                  🔐 Request Verification
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.patch(`${API_BASE_URL}/citizens/${id}`, {
                        verification_state: "verified",
                      });
                      alert("Citizen marked as verified!");
                      fetchCitizenData();
                    } catch (err) {
                      alert("Failed to verify: " + err.message);
                    }
                  }}
                  style={{
                    background: "#10b981",
                    color: "white",
                    padding: "1rem 2rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✓ Mark as Verified
                </button>
              </>
            )}

            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-primary">
                Edit Profile
              </button>
            )}
            <button
              onClick={handleDeleteCitizen}
              style={{
                background: "#ef4444",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* OTP Verification Form */}
        {verifying && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "white",
              border: "2px solid black",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0" }}>Enter Verification Code</h3>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength="6"
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "6px",
                  border: "2px solid black",
                  fontSize: "1rem",
                  width: "150px",
                }}
              />
              <button onClick={verifyOTP} className="btn-primary">
                Verify
              </button>
              <button
                onClick={() => setVerifying(false)}
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: "2px solid black",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
            {otpData && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#92400e",
                }}
              >
                📱 OTP expires at:{" "}
                {new Date(otpData.expires_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Profile Information */}
      <div
        style={{
          background: "white",
          border: "2px solid black",
          borderRadius: "8px",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        {editing ? (
          <form onSubmit={handleUpdateCitizen}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
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
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  Neighborhood
                </label>
                <input
                  type="text"
                  value={formData.neighborhood || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, neighborhood: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                  }}
                >
                  Zone ID
                </label>
                <input
                  type="text"
                  value={formData.zone_id || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, zone_id: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "1rem 1.25rem",
                    borderRadius: "6px",
                    border: "2px solid black",
                  }}
                />
              </div>

              <div>
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
                  value={formData.verification_state || "unverified"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
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
                  <option value="unverified">Unverified</option>
                  <option value="verified">Verified</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData(citizen);
                }}
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "6px",
                  border: "2px solid black",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Full Name
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.full_name}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Email
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.email || "N/A"}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Phone
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.phone || "N/A"}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                City
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.city || "N/A"}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Neighborhood
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.neighborhood || "N/A"}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Zone ID
              </h3>
              <p style={{ fontSize: "1.1rem", margin: "0" }}>
                {citizen.zone_id || "N/A"}
              </p>
            </div>

            <div>
              <h3
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                Verification Status
              </h3>
              <p
                style={{
                  fontSize: "1.1rem",
                  margin: "0",
                  color:
                    citizen.verification_state === "verified"
                      ? "#10b981"
                      : "#6b7280",
                  fontWeight: "600",
                }}
              >
                {citizen.verification_state === "verified"
                  ? "✓ Verified"
                  : "○ Unverified"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {statistics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "white",
              border: "2px solid black",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                color: "#6b7280",
                fontSize: "0.9rem",
                margin: "0 0 0.5rem 0",
              }}
            >
              Total Requests
            </h3>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                margin: "0",
                color: "#111827",
              }}
            >
              {statistics.total_requests}
            </p>
          </div>

          <div
            style={{
              background: "white",
              border: "2px solid black",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                color: "#6b7280",
                fontSize: "0.9rem",
                margin: "0 0 0.5rem 0",
              }}
            >
              Average Rating
            </h3>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                margin: "0",
                color: "#f59e0b",
              }}
            >
              ⭐ {statistics.avg_rating?.toFixed(1) || "0.0"}
            </p>
          </div>

          <div
            style={{
              background: "white",
              border: "2px solid black",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                color: "#6b7280",
                fontSize: "0.9rem",
                margin: "0 0 0.5rem 0",
              }}
            >
              Member Since
            </h3>
            <p
              style={{
                fontSize: "1.2rem",
                fontWeight: "600",
                margin: "0",
                color: "#111827",
              }}
            >
              {new Date(citizen.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Requests by Status */}
      {statistics &&
        statistics.status_breakdown &&
        Object.keys(statistics.status_breakdown).length > 0 && (
          <div
            style={{
              background: "white",
              border: "2px solid black",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <h2>Requests by Status</h2>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {Object.entries(statistics.status_breakdown).map(
                ([status, count]) => (
                  <div
                    key={status}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "#f9fafb",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: getStatusColor(status),
                      }}
                    ></span>
                    <span
                      style={{ fontWeight: "600", textTransform: "capitalize" }}
                    >
                      {status}:
                    </span>
                    <span style={{ color: "#6b7280" }}>{count}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

      {/* Requests List */}
      <div
        style={{
          background: "white",
          border: "2px solid black",
          borderRadius: "8px",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2>My Service Requests ({requests.length})</h2>
          <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            All reports submitted by {citizen.full_name}
          </div>
        </div>
        {requests.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {requests.map((request) => (
              <Link
                key={request._id}
                to={`/requests/${request._id}?citizenId=${id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    border: "2px solid black",
                    borderRadius: "6px",
                    padding: "1rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                    e.currentTarget.style.borderColor = "black";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "black";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 0.5rem 0", color: "#111827" }}>
                        {request.title}
                      </h3>
                      <p
                        style={{
                          margin: "0 0 0.5rem 0",
                          color: "#6b7280",
                          fontSize: "0.9rem",
                        }}
                      >
                        {request.request_id} • {request.category}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "6px",
                        background: getStatusColor(request.status) + "20",
                        color: getStatusColor(request.status),
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0.5rem 0 0 0",
                      color: "#6b7280",
                      fontSize: "0.9rem",
                    }}
                  >
                    Created:{" "}
                    {new Date(
                      request.timestamps?.created_at,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>
            No service requests submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default CitizenProfile;
