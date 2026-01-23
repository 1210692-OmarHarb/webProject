import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_BASE_URL = "http://localhost:8000";

function CitizenRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    neighborhood: "",
    city: "",
    zone_id: "",
    verification_state: "unverified",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/citizens/`, formData);
      const citizenId = response.data._id;

      if (formData.verification_state === "pending") {
        try {
          const otpRes = await axios.post(
            `${API_BASE_URL}/citizens/${citizenId}/request-verification`,
          );
          alert(
            `Citizen registered! Verification OTP: ${otpRes.data.otp_stub}\n\nYou can verify this citizen in their profile.`,
          );
        } catch (otpErr) {
          alert("Citizen registered, but failed to send verification OTP.");
        }
      } else {
        alert("Citizen registered successfully!");
      }

      navigate(`/citizens/${citizenId}`);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to register citizen: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container">
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
        <h1>Register New Citizen</h1>
        <p style={{ color: "#6b7280" }}>
          Create a new citizen profile to track service requests and manage
          community engagement.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid black",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          border: "2px solid black",
          borderRadius: "8px",
          padding: "2rem",
        }}
      >
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
              Full Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
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
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
              }}
            />
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>
              Optional - for notifications
            </small>
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
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+962-7-xxxx-xxxx"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
              }}
            />
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>
              Optional - for SMS notifications
            </small>
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
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., Amman"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
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
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="e.g., Downtown, Jabal Amman"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
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
              name="zone_id"
              value={formData.zone_id}
              onChange={handleChange}
              placeholder="e.g., ZONE-DT-01"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
              }}
            />
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>
              Service zone identifier
            </small>
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
              name="verification_state"
              value={formData.verification_state}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "6px",
                border: "2px solid black",
                fontSize: "1rem",
              }}
            >
              <option value="unverified">Unverified</option>
              <option value="pending">Pending (Request OTP)</option>
              <option value="verified">Verified (Skip verification)</option>
            </select>
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>
              Choose "Pending" to automatically request verification OTP
            </small>
          </div>
        </div>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "2px solid black",
          }}
        >
          <div
            style={{
              padding: "1rem",
              background: "#eff6ff",
              border: "2px solid black",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <strong>💡 Quick Start:</strong>
            <ul style={{ margin: "0.5rem 0 0 1.25rem", paddingLeft: 0 }}>
              <li>
                Select "Pending" to receive a verification OTP after
                registration
              </li>
              <li>Select "Verified" to skip verification (for testing)</li>
              <li>
                Only verified citizens can submit official service requests
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            gap: "1rem",
          }}
        >
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Registering..." : "Register Citizen"}
          </button>
          <Link to="/citizens">
            <button
              type="button"
              style={{
                padding: "1rem 2rem",
                borderRadius: "6px",
                border: "2px solid black",
                background: "white",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          background: "#eff6ff",
          borderRadius: "8px",
          border: "2px solid black",
        }}
      >
        <h3 style={{ marginTop: "0", color: "#1e40af" }}>
          ℹ️ Registration Tips
        </h3>
        <ul style={{ color: "#1e40af", lineHeight: "1.8", margin: "0" }}>
          <li>
            Only the <strong>Full Name</strong> field is required
          </li>
          <li>Provide email or phone for receiving request updates</li>
          <li>Zone ID helps with service assignment and routing</li>
          <li>Verified citizens can access additional features</li>
        </ul>
      </div>
    </div>
  );
}

export default CitizenRegister;
