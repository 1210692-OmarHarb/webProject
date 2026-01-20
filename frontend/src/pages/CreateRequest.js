import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { requestsAPI, categoriesAPI } from "../services/api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function LocationMarker({ position, setPosition, setAddress }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      // Reverse geocoding would go here in a real app
      setAddress(
        `Location: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
      );
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
  ) : null;
}

function CreateRequest() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
  });
  const [position, setPosition] = useState([31.9539, 35.9106]); // Default to Amman, Jordan
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        setCategories(response.data || []);
        setLoadingCategories(false);
      } catch (err) {
        console.error("Failed to load categories:", err);
        // Fallback to hardcoded categories if API fails
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const requestData = {
        ...formData,
        location: {
          type: "Point",
          coordinates: [position[1], position[0]], // [longitude, latitude]
        },
      };

      await requestsAPI.create(requestData);
      alert("Request submitted successfully!");
      navigate("/requests");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Submit a Service Request</h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={100}
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories
                  ? "Loading categories..."
                  : "Select a category"}
              </option>
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

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={500}
              placeholder="Detailed description of the issue"
            />
          </div>

          <div className="form-group">
            <label>Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              maxLength={200}
              placeholder="Street address or location description"
            />
          </div>

          <div className="form-group">
            <label>Location (Click on map to select) *</label>
            <div className="map-container">
              <MapContainer
                center={position}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationMarker
                  position={position}
                  setPosition={setPosition}
                  setAddress={(addr) =>
                    setFormData({ ...formData, address: addr })
                  }
                />
              </MapContainer>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#7f8c8d",
                marginTop: "0.5rem",
              }}
            >
              Selected: {position[0].toFixed(4)}, {position[1].toFixed(4)}
            </p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateRequest;
