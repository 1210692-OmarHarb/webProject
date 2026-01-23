import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { analyticsAPI } from "../services/api";

function bucketPoints(features) {
  const buckets = new Map();
  features.forEach((f) => {
    const [lng, lat] = f.geometry.coordinates;
    const key = `${lat.toFixed(2)}|${lng.toFixed(2)}`;
    const existing = buckets.get(key) || { lat, lng, weight: 0, items: [] };
    existing.weight += f.properties.weight || 1;
    existing.items.push(f);
    buckets.set(key, existing);
  });
  return Array.from(buckets.values());
}

function LiveMap() {
  const [filters, setFilters] = useState({ category: "", zone: "" });
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHeat = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.zone) params.zone = filters.zone;
      const res = await analyticsAPI.heatmap(params);
      setFeatures(res.data.features || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load map data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeat();
  }, [filters.category, filters.zone]);

  const grouped = useMemo(() => bucketPoints(features), [features]);

  return (
    <div className="container">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ marginBottom: "0.5rem" }}>Live Map</h1>
            <p style={{ color: "#6b7280" }}>
              Heat-map of open requests with lightweight clustering.
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  color: "#374151",
                }}
              >
                Category
              </label>
              <input
                name="category"
                value={filters.category}
                onChange={(e) =>
                  setFilters({ ...filters, category: e.target.value })
                }
                placeholder="pothole"
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  color: "#374151",
                }}
              >
                Zone
              </label>
              <input
                name="zone"
                value={filters.zone}
                onChange={(e) =>
                  setFilters({ ...filters, zone: e.target.value })
                }
                placeholder="ZONE-DT-01"
                style={{
                  padding: "1rem 1.25rem",
                  border: "2px solid black",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  backgroundColor: "white",
                  color: "black",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading map...</div>}

      {!loading && (
        <div className="card">
          <div className="map-container">
            <MapContainer
              center={[31.95, 35.21]}
              zoom={12}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {grouped.map((b, idx) => {
                const radius = Math.min(40, 6 + b.weight * 2);
                const opacity = Math.min(0.85, 0.25 + b.weight * 0.05);
                return (
                  <CircleMarker
                    key={idx}
                    center={[b.lat, b.lng]}
                    radius={radius}
                    pathOptions={{
                      color: "#ef4444",
                      fillColor: "#ef4444",
                      fillOpacity: opacity,
                      opacity: 0.7,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -radius]}>
                      <div style={{ minWidth: "180px" }}>
                        <div style={{ fontWeight: 600 }}>
                          Cluster ({b.items.length})
                        </div>
                        {b.items.slice(0, 4).map((f) => (
                          <div
                            key={f.properties.request_id}
                            style={{ fontSize: "0.85rem" }}
                          >
                            {f.properties.category} – {f.properties.priority} –{" "}
                            {f.properties.status}
                          </div>
                        ))}
                        {b.items.length > 4 && (
                          <div>+{b.items.length - 4} more</div>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            Bubbles scale by weight (priority × age). Bucketing approximates
            clustering without extra plugins.
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveMap;
