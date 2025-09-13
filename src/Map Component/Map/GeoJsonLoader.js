import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { handleMurabbaClick } from "./geoJsonTransform";
import { bindMurabbaTooltip } from "./bindTooltips";
import "../css/GeoJsonLoader.css";

const GeoJsonLoader = ({
  geoJsonUrl,
  mustateelLayers,
  setMurabbaOptions,
  onMurabbaSelect,
  setBoundsFit,
  onGeoJsonLoaded,
  resetFlag,      // re-run effect when this changes
  geoJsonReady,   // callback to inform parent that layer is mounted
}) => {
  const map = useMap();
  const geoJsonLayerRef = useRef(null);

  // Track the “base” URL (without ?t=…) so we only fitBounds once per mauza
  const previousBaseUrlRef = useRef(null);
  const fittedForBaseRef = useRef(false);

  // Track the exact URL (including ?t=…) so we re-fetch whenever it truly changes
  const previousFullUrlRef = useRef(null);

  useEffect(() => {
    console.log(
      "[GeoJsonLoader] useEffect fired.",
      "geoJsonUrl:", geoJsonUrl,
      "resetFlag:", resetFlag
    );

    const loadGeoJsonLayer = async () => {
      // If no URL at all, remove any existing layer and clear state
      if (!geoJsonUrl) {
        if (geoJsonLayerRef.current || previousBaseUrlRef.current) {
          console.log("[GeoJsonLoader] Clearing existing layer (no URL).");
          mustateelLayers.current.forEach((layer) => {
            map.removeLayer(layer);
            console.log("[GeoJsonLoader] Removed mustateel layer:", layer);
          });
          mustateelLayers.current = [];
          if (geoJsonLayerRef.current) {
            map.removeLayer(geoJsonLayerRef.current);
            console.log("[GeoJsonLoader] Removed geoJsonLayerRef:", geoJsonLayerRef.current);
            geoJsonLayerRef.current = null;
          }
        }
        previousFullUrlRef.current = null;
        previousBaseUrlRef.current = null;
        fittedForBaseRef.current = false;
        setMurabbaOptions([]);
        if (onGeoJsonLoaded) onGeoJsonLoaded();
        return;
      }

      // Split off any “?t=” cache-buster
      const [baseUrl] = geoJsonUrl.split("?");
      const fullUrl = geoJsonUrl; // e.g. "http://…/Yazman/1 DNB?t=12345"

      const relativePath = baseUrl.split("/api/geojson/")[1] || "";
      const murabbaBase = `${process.env.PUBLIC_URL || ""}/JSON%20Murabba/${relativePath}/`;

      // If the base (mauza path) changed, we will need to fitBounds again
      if (baseUrl !== previousBaseUrlRef.current) {
        fittedForBaseRef.current = false;
        console.log(
          "[GeoJsonLoader] Base changed from",
          previousBaseUrlRef.current,
          "→",
          baseUrl,
          "– will fitBounds again."
        );
        previousBaseUrlRef.current = baseUrl;
      }

      // If this exact full URL (with cache-buster) was already handled, skip
      if (fullUrl === previousFullUrlRef.current) {
        console.log("[GeoJsonLoader] Full URL unchanged; skipping load.");
        return;
      }

      // Otherwise, remove any old layer first
      if (geoJsonLayerRef.current) {
        console.log("[GeoJsonLoader] Removing previous GeoJSON layer.");
        mustateelLayers.current.forEach((layer) => {
          map.removeLayer(layer);
          console.log("[GeoJsonLoader] Removed mustateel layer:", layer);
        });
        mustateelLayers.current = [];
        map.removeLayer(geoJsonLayerRef.current);
        console.log("[GeoJsonLoader] Removed geoJsonLayerRef:", geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
        fittedForBaseRef.current = false;
      }

      // Now record that we’re about to fetch this full URL
      previousFullUrlRef.current = fullUrl;
      console.log("[GeoJsonLoader] Set previousFullUrlRef to:", fullUrl);

      // Fetch + parse + add new GeoJSON layer
      try {
        console.log("[GeoJsonLoader] Fetching GeoJSON from:", fullUrl);
        const response = await fetch(fullUrl, { cache: 'no-store' });
        const text = await response.text();
        console.log("[GeoJsonLoader] Fetch response status:", response.status);

        if (!response.ok) {
          console.error(
            "[GeoJsonLoader] Fetch error:",
            response.status,
            text.slice(0, 200)
          );
          throw new Error(`Fetch error ${response.status}: ${text.slice(0, 200)}`);
        }

        let geoJsonData;
        try {
          geoJsonData = JSON.parse(text);
          console.log("[GeoJsonLoader] Parsed GeoJSON data:", geoJsonData);
        } catch (parseErr) {
          console.error("[GeoJsonLoader] JSON parse error:", parseErr.message);
          throw new Error("Invalid JSON structure in response.");
        }

        // If no features, clear Murabba dropdown and exit
        if (!geoJsonData.features || geoJsonData.features.length === 0) {
          console.warn("[GeoJsonLoader] No features found; clearing Murabba options.");
          setMurabbaOptions([]);
          if (onGeoJsonLoaded) onGeoJsonLoaded();
          return;
        }

        // DEBUG: log first feature’s coords to ensure shift took effect
        console.log(
          "[GeoJsonLoader] First feature coords (post-fetch):",
          geoJsonData.features[0].geometry.coordinates
        );

        
        // Collect Murabba numbers as strings so downstream components
        // (which rely on string methods like toLowerCase) behave
        // consistently regardless of whether the source value is a
        // number or already a string in the GeoJSON.
        const murabbaNumbers = geoJsonData.features
          .filter((f) => f.properties?.Murabba_No != null)
          .map((f) => String(f.properties.Murabba_No))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        console.log("[GeoJsonLoader] murabbaNumbers:", murabbaNumbers);
        setMurabbaOptions(murabbaNumbers);

        // Create a new Leaflet GeoJSON layer
        const newGeoJsonLayer = L.geoJSON(geoJsonData, {
          onEachFeature: (feature, layer) => {
            if (feature.properties?.Murabba_No) {
              bindMurabbaTooltip(feature, layer, map);

              layer.on("click", () => {
                console.log(
                  "[GeoJsonLoader] Murabba feature clicked:",
                  feature.properties.Murabba_No
                );
               handleMurabbaClick(feature, map, mustateelLayers, murabbaBase);
              });
              layer.on("programmaticSelect", () => {
                console.log(
                  "[GeoJsonLoader] programmaticSelect feature:",
                  feature.properties.Murabba_No
                );
               handleMurabbaClick(feature, map, mustateelLayers, murabbaBase);
              });
            }
          },
          style: {
            fillColor: "#000000",
            fillOpacity: 0,
            color: "#ff0c04",
            weight: 3,
          },
        });

        console.log("[GeoJsonLoader] Adding newGeoJsonLayer to map.");
        newGeoJsonLayer.addTo(map);
        geoJsonLayerRef.current = newGeoJsonLayer;

        console.log("[GeoJsonLoader] Calling geoJsonReady callback.");
        if (typeof geoJsonReady === "function") {
          geoJsonReady(newGeoJsonLayer);
        }

        // Only fitBounds once per mauza (baseUrl)
        if (!fittedForBaseRef.current) {
          const bounds = newGeoJsonLayer.getBounds();
          console.log("[GeoJsonLoader] Computed bounds:", bounds);
          if (bounds.isValid()) {
            console.log("[GeoJsonLoader] Calling map.fitBounds(...)");
            map.fitBounds(bounds);
            setBoundsFit(true);
            fittedForBaseRef.current = true;
            console.log("[GeoJsonLoader] fittedForBaseRef set to true.");
          } else {
            console.warn("[GeoJsonLoader] Invalid bounds for GeoJSON layer.");
          }
        } else {
          console.log(
            "[GeoJsonLoader] Skipping fitBounds (already done once for this mauza)."
          );
        }

        if (onGeoJsonLoaded) onGeoJsonLoaded();
      } catch (error) {
        console.error("❌ [GeoJsonLoader] Error loading GeoJSON:", error.message);
        if (onGeoJsonLoaded) onGeoJsonLoaded();
      }
    };

    loadGeoJsonLayer();

    return () => {
      // Clean up on unmount or next URL change
      if (geoJsonLayerRef.current) {
        console.log("[GeoJsonLoader] Cleanup: removing existing layers.");
        mustateelLayers.current.forEach((layer) => {
          map.removeLayer(layer);
          console.log("[GeoJsonLoader] Removed mustateel layer in cleanup:", layer);
        });
        mustateelLayers.current = [];

        map.removeLayer(geoJsonLayerRef.current);
        console.log(
          "[GeoJsonLoader] Removed geoJsonLayerRef in cleanup:",
          geoJsonLayerRef.current
        );
        geoJsonLayerRef.current = null;
      }
    };
  }, [
    geoJsonUrl,
    map,
    mustateelLayers,
    setMurabbaOptions,
    setBoundsFit,
    onGeoJsonLoaded,
    resetFlag,
  ]);
  // When a Murabba is selected externally, fire its “programmaticSelect” event
  useEffect(() => {
    if (onMurabbaSelect && geoJsonLayerRef.current) {
      console.log("[GeoJsonLoader] onMurabbaSelect changed:", onMurabbaSelect);
      const featureToSelect = geoJsonLayerRef.current
        .toGeoJSON()
        .features.find(
          (feat) =>
            String(feat.properties?.Murabba_No) === String(onMurabbaSelect)
        );
      if (featureToSelect) {
        geoJsonLayerRef.current.eachLayer((layer) => {
          if (
            String(layer.feature.properties?.Murabba_No) ===
            String(onMurabbaSelect)
          ) 
           {            
            console.log(
              "[GeoJsonLoader] Firing programmaticSelect on layer:",
              onMurabbaSelect
            );
            layer.fire("programmaticSelect");
          }
        });
      } else {
        console.warn("[GeoJsonLoader] No layer found for Murabba:", onMurabbaSelect);
      }
    }
  }, [onMurabbaSelect]);

  return null;
};

export default GeoJsonLoader;
