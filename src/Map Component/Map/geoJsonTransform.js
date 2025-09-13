import * as turf from "@turf/turf";
import L from "leaflet";
import MustateelGeojson from "./MustateelGeojson";
import { bindKillaTooltip } from "./bindTooltips";

export const transformGeoJsonWithTurf = (geojsonData, topLeft, topRight, bottomRight, bottomLeft) => {
  const matrixSize = 5;
  const width = turf.distance(turf.point(topLeft), turf.point(topRight), { units: "meters" });
  const height = turf.distance(turf.point(topLeft), turf.point(bottomLeft), { units: "meters" });
  const cellWidth = width / matrixSize;
  const cellHeight = height / matrixSize;
  const bearingTop = turf.bearing(turf.point(topLeft), turf.point(topRight));
  const bearingLeft = turf.bearing(turf.point(topLeft), turf.point(bottomLeft));

  geojsonData.features.forEach((feature, index) => {
    const col = index % matrixSize;
    const row = Math.floor(index / matrixSize);
    const cellOrigin = turf.destination(
      turf.destination(turf.point(topLeft), col * cellWidth, bearingTop, { units: "meters" }),
      row * cellHeight,
      bearingLeft,
      { units: "meters" }
    );

    const cellTopLeft = cellOrigin;
    const cellTopRight = turf.destination(cellTopLeft, cellWidth, bearingTop, { units: "meters" });
    const cellBottomLeft = turf.destination(cellTopLeft, cellHeight, bearingLeft, { units: "meters" });
    const cellBottomRight = turf.destination(cellTopRight, cellHeight, bearingLeft, { units: "meters" });

    const newCoords = [
      [cellTopLeft.geometry.coordinates, cellTopRight.geometry.coordinates, cellBottomRight.geometry.coordinates, cellBottomLeft.geometry.coordinates, cellTopLeft.geometry.coordinates]
    ];

    feature.geometry.coordinates = newCoords;
  });

  return geojsonData;
};

export const handleMurabbaClick = async (
 murabbaFeature,
  map,
  mustateelLayers,
  murabbaBaseUrl
) => {
  const murabbaNo = murabbaFeature.properties?.Murabba_No;

  // Avoid loading the same murabba multiple times
  if (murabbaNo != null) {
    const existing = mustateelLayers.current.find(
      (layer) => layer.murabbaNo === murabbaNo
    );
    if (existing) {
      // If already loaded, simply zoom to it
      map.fitBounds(existing.getBounds());
      return;
    }
  }

  if (murabbaBaseUrl && murabbaNo != null) {
    const base = murabbaBaseUrl.endsWith("/")
      ? murabbaBaseUrl
      : `${murabbaBaseUrl}/`;
    // Some murabba numbers contain "/" which cannot appear in file names.
    // Replace all slashes with dashes so the URL matches the stored
    // "<murabba>.geojson" naming convention.
    const sanitizedMurabba = String(murabbaNo).replace(/\//g, "-");
    const murabbaUrl = `${base}${encodeURIComponent(sanitizedMurabba)}.geojson?t=${Date.now()}`;
    try {
      const res = await fetch(murabbaUrl, { cache: 'no-store' });
      if (res.ok) {
        const murabbaGeo = await res.json();

        const layer = L.geoJSON(murabbaGeo, {
          style: { color: "#FFD700", weight: 2, fillOpacity: 0 },
          onEachFeature: (feature, l) => {
            bindKillaTooltip(feature, l, map);
          },
        }).addTo(map);

        layer.murabbaNo = murabbaNo;
        mustateelLayers.current.push(layer);
        map.fitBounds(layer.getBounds());
        return;
      }
    } catch (err) {
      console.warn("Murabba file fetch failed, using template grid:", err);
    }
  }

  const murabbaCoordinates = murabbaFeature.geometry.coordinates[0];
  const topLeft = murabbaCoordinates[0];
  const topRight = murabbaCoordinates[1];
  const bottomRight = murabbaCoordinates[2];
  const bottomLeft = murabbaCoordinates[3];

  const transformedGeojson = transformGeoJsonWithTurf(
    { ...MustateelGeojson },
    topLeft,
    topRight,
    bottomRight,
    bottomLeft
  );

  const mustateelLayer = L.geoJSON(transformedGeojson, {
    style: { color: "#FFD700", weight: 2, fillOpacity: 0 },
    onEachFeature: (feature, layer) => {
      bindKillaTooltip(feature, layer, map);
    },
  }).addTo(map);

  mustateelLayer.murabbaNo = murabbaNo;
  mustateelLayers.current.push(mustateelLayer);
  map.fitBounds(mustateelLayer.getBounds());
};
