export const getLayerType = (layer, LLib) => {
  const L = LLib || window.L;
  if (layer instanceof L.Polygon) {
    return 'polygon';
  } else if (layer instanceof L.Polyline) {
    return 'polyline';
  } else if (layer instanceof L.Rectangle) {
    return 'rectangle';
  } else if (layer instanceof L.Circle) {
    return 'circle';
  } else if (layer instanceof L.Marker) {
    return 'marker';
  }
  return null;
};

export const formatAreaCustomUnits = (areaSqFeet) => {
  const marlaInSqFeet = 272.25;
  const kanalInSqFeet = marlaInSqFeet * 20;
  const acreInSqFeet = kanalInSqFeet * 8;

  let acres = 0,
    kanals = 0,
    marlas = 0;
  let remainingSqFeet = areaSqFeet;

  if (remainingSqFeet >= acreInSqFeet) {
    acres = Math.floor(remainingSqFeet / acreInSqFeet);
    remainingSqFeet = remainingSqFeet % acreInSqFeet;
  }
  if (remainingSqFeet >= kanalInSqFeet) {
    kanals = Math.floor(remainingSqFeet / kanalInSqFeet);
    remainingSqFeet = remainingSqFeet % kanalInSqFeet;
  }
  if (remainingSqFeet >= marlaInSqFeet) {
    marlas = Math.floor(remainingSqFeet / marlaInSqFeet);
    remainingSqFeet = remainingSqFeet % marlaInSqFeet;
  }

  return `Area:<br>${acres}-Acre <br>${kanals}-Kanal <br>${marlas}-Marla <br>${remainingSqFeet.toFixed(
    2
  )}-Sq Feet`;
};

export const addLengthLabel = (latlngA, latlngB, map, LLib) => {
  const L = LLib || window.L;
  const distanceInMeters = latlngA.distanceTo(latlngB);
  const distanceInFeet = distanceInMeters * 3.28084;
  const midpoint = L.latLng((latlngA.lat + latlngB.lat) / 2, (latlngA.lng + latlngB.lng) / 2);
  const label = L.marker(midpoint, {
    icon: L.divIcon({
      className: 'distance-label',
      html: `<div class="distance-label">${distanceInFeet.toFixed(2)} Ft</div>`,
      iconSize: null,
      iconAnchor: [0, 0],
    }),
  }).addTo(map);
  return label;
};

export const showSegmentLengths = (layer, map, featureLabels, LLib) => {
  const L = LLib || window.L;
  const latlngs = layer.getLatLngs();
  const labels = featureLabels.get(layer) || [];

  if (Array.isArray(latlngs[0])) {
    latlngs[0].forEach((latlng, index) => {
      if (index < latlngs[0].length - 1) {
        labels.push(addLengthLabel(latlng, latlngs[0][index + 1], map, L));
      }
    });
    labels.push(
      addLengthLabel(latlngs[0][latlngs[0].length - 1], latlngs[0][0], map, L)
    );
  } else {
    latlngs.forEach((latlng, index) => {
      if (index < latlngs.length - 1) {
        labels.push(addLengthLabel(latlng, latlngs[index + 1], map, L));
      }
    });
  }
  featureLabels.set(layer, labels);
};

export const showPolygonArea = (layer, map, featureLabels, LLib) => {
  const L = LLib || window.L;
  const latlngs = layer.getLatLngs()[0];
  const areaInMeters = L.GeometryUtil.geodesicArea(latlngs);
  const areaInSquareFeet = areaInMeters * 10.7639;
  const areaLabel = formatAreaCustomUnits(areaInSquareFeet);
  const label = L.marker(layer.getBounds().getCenter(), {
    icon: L.divIcon({
      className: 'area-label',
      html: `<div class="area-label">${areaLabel}</div>`,
      iconSize: null,
      iconAnchor: [0, 0],
    }),
  }).addTo(map);
  const labels = featureLabels.get(layer) || [];
  labels.push(label);
  featureLabels.set(layer, labels);
};

export const showCircleDetails = (layer, map, featureLabels, LLib) => {
  const L = LLib || window.L;
  const radiusInMeters = layer.getRadius();
  const areaInMeters = Math.PI * Math.pow(radiusInMeters, 2);
  const areaInSquareFeet = areaInMeters * 10.7639;
  const areaLabel = formatAreaCustomUnits(areaInSquareFeet);
  const center = layer.getLatLng();
  const label = L.marker(center, {
    icon: L.divIcon({
      className: 'circle-label',
      html: `<div class="circle-label">Radius: ${(radiusInMeters * 3.28084).toFixed(2)} Ft<br>${areaLabel}</div>`,
      iconSize: null,
      iconAnchor: [0, 0],
    }),
  }).addTo(map);
  const labels = featureLabels.get(layer) || [];
  labels.push(label);
  featureLabels.set(layer, labels);
};

export const showMarkerCoordinates = (layer, map, featureLabels, LLib) => {
  const L = LLib || window.L;
  const latlng = layer.getLatLng();
  const tooltipText = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
  const label = L.marker(latlng, {
    icon: L.divIcon({
      className: 'marker-label',
      html: `<div class="marker-label">${tooltipText}</div>`,
      iconSize: null,
      iconAnchor: [0, 0],
    }),
  }).addTo(map);
  label.on('click', () => {
    navigator.clipboard.writeText(tooltipText).catch(() => {});
  });
  const labels = featureLabels.get(layer) || [];
  labels.push(label);
  featureLabels.set(layer, labels);
};

export const addMeasurementLabels = (layer, map, featureLabels, LLib) => {
  const L = LLib || window.L;
  const type = getLayerType(layer, L);
  if (type === 'polyline') {
    showSegmentLengths(layer, map, featureLabels, L);
  } else if (type === 'polygon' || type === 'rectangle') {
    showPolygonArea(layer, map, featureLabels, L);
    showSegmentLengths(layer, map, featureLabels, L);
  } else if (type === 'circle') {
    showCircleDetails(layer, map, featureLabels, L);
  } else if (type === 'marker') {
    showMarkerCoordinates(layer, map, featureLabels, L);
  }
};
export const adjustTooltipVisibility = (featureLabels, zoomLevel) => {
  const minZoomForTooltips = 14;
  featureLabels.forEach((labels) => {
    labels.forEach((label) => {
      const el = label.getElement();
      if (el) {
        el.style.display = zoomLevel >= minZoomForTooltips ? 'block' : 'none';
      }
    });
  });
};

export const adjustTooltipSize = (featureLabels, zoomLevel) => {
  const fontSizeClass = zoomLevel >= 16 ? 'label-large' : zoomLevel >= 14 ? 'label-medium' : 'label-small';
  featureLabels.forEach((labels) => {
    labels.forEach((label) => {
      const el = label.getElement();
      if (el) {
        el.classList.remove('label-small', 'label-medium', 'label-large');
        el.classList.add(fontSizeClass);
      }
    });
  });
};