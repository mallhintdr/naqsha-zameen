import React, { useEffect, useState, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "./css/LayerControl.css";

const LayerControlDropdown = () => {
  const map = useMap();

  // The user can pick any base layer from the dropdown
  const [selectedLayer, setSelectedLayer] = useState("Hybrid Satellite");

  // Store the "currently active base layer" so we can remove it before adding the next.
  const baseLayerRef = useRef(null);

  useEffect(() => {
    // Define your base layers as Leaflet tile layers
    const layers = {
      "Street Map": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 21,
        minZoom: 5,
      }),
      "Hybrid Satellite": L.tileLayer(
        "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          maxZoom: 21,
          minZoom: 5,
        }
      ),
      "Satellite Imagery": L.tileLayer(
        "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          maxZoom: 21,
          minZoom: 5,
        }
      ),
    };

    // 1) Remove the old base layer if it exists
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }

    // 2) Add the newly selected base layer
    const newBaseLayer = layers[selectedLayer];
    newBaseLayer.addTo(map);

    // 3) Store it in our ref
    baseLayerRef.current = newBaseLayer;

    // CLEANUP: If this component unmounts entirely, remove the current base layer
    return () => {
      // CAREFUL: if we remove the base layer each time the effect re-runs,
      // that's fine since we're about to add the new one. 
      // If the component truly unmounts, we also remove it from the map.
      if (baseLayerRef.current) {
        map.removeLayer(baseLayerRef.current);
      }
    };
  }, [map, selectedLayer]);

  const handleLayerChange = (event) => {
    setSelectedLayer(event.target.value);
  };

  return (
    <div className="dropdown-container">
      <select
        value={selectedLayer}
        onChange={handleLayerChange}
        className="dropdown-select"
      >
        <option value="Street Map">Street Map</option>
        <option value="Hybrid Satellite">Hybrid Satellite</option>
        <option value="Satellite Imagery">Satellite Imagery</option>
      </select>
    </div>
  );
};

export default LayerControlDropdown;
