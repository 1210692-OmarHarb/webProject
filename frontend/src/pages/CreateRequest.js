import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { requestsAPI, categoriesAPI, citizensAPI } from "../services/api";
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
  const [searchParams] = useSearchParams();
  const preSelectedCitizenId = searchParams.get('citizenId');
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
    citizen_id: preSelectedCitizenId || "",
  });
  const [position, setPosition] = useState([31.9539, 35.9106]); // Default to Amman, Jordan
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [citizens, setCitizens] = useState([]);
  const [loadingCitizens, setLoadingCitizens] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState(null);

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
    
    const fetchCitizens = async () => {
      try {
        const response = await citizensAPI.getAll();
        setCitizens(response.data || []);
        setLoadingCitizens(false);
        
        // If there's a pre-selected citizen, find and set it
        if (preSelectedCitizenId && response.data) {
          const citizen = response.data.find(c => c._id === preSelectedCitizenId);
          if (citizen) {
            setSelectedCitizen(citizen);
          }
        }
      } catch (err) {
        console.error("Failed to load citizens:", err);
        setLoadingCitizens(false);
      }
    };
    
    fetchCategories();
    fetchCitizens();
  }, [preSelectedCitizenId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // If citizen selection changed, update selected citizen
    if (name === "citizen_id") {
      const citizen = citizens.find(c => c._id === value);
      setSelectedCitizen(citizen || null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const now = new Date();
      
      // Find selected citizen
      const selectedCitizen = citizens.find(c => c._id === formData.citizen_id);
      
      const requestData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        address: formData.address,
        location: {
          type: "Point",
          coordinates: [position[1], position[0]], // [longitude, latitude]
        },
        citizen_ref: selectedCitizen ? {
          citizen_id: selectedCitizen._id,
          full_name: selectedCitizen.full_name,
          contact: {
            email: selectedCitizen.email,
            phone: selectedCitizen.phone
          },
          verification_state: selectedCitizen.verification_state
        } : null,
        timestamps: {
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString()
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
            <label>Citizen (Submit as) *</label>
            <select
              name="citizen_id"
              value={formData.citizen_id}
              onChange={handleChange}
              required
              disabled={loadingCitizens}
            >
              <option value="">
                {loadingCitizens
                  ? "Loading citizens..."
                  : "Select a citizen"}
              </option>
              {citizens.map((citizen) => (
                <option key={citizen._id} value={citizen._id}>
                  {citizen.full_name} {citizen.verification_state === "verified" ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>
          
          {/* Display Selected Citizen Info */}
          {selectedCitizen && (
            <div style={{
              background: "#f0fdf4",
              border: "2px solid #10b981",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem"
            }}>
              <h3 style={{ margin: "0 0 0.75rem 0", color: "#065f46", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ✅ Submitting as Verified Citizen
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.95rem" }}>
                <div><strong>Name:</strong> {selectedCitizen.full_name}</div>
                <div><strong>Email:</strong> {selectedCitizen.email || "N/A"}</div>
                <div><strong>Phone:</strong> {selectedCitizen.phone || "N/A"}</div>
                <div><strong>City:</strong> {selectedCitizen.city || "N/A"}</div>
              </div>
              {selectedCitizen.verification_state === "verified" && (
                <div style={{ 
                  marginTop: "0.75rem", 
                  padding: "0.5rem", 
                  background: "#dcfce7", 
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  color: "#065f46"
                }}>
                  ✓ You can track this report, add comments, and upload evidence after submission
                </div>
              )}
            </div>
          )}

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
