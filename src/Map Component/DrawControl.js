import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet-editable';

// Fix for missing default icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DrawControl = ({ drawnItemsRef, onDrawnChange }) => { // ✅ CORRECT
  const map = useMap();
  const featureLabels = useRef(new Map()); // Store labels for each feature separately

  useEffect(() => {
        const drawnItems = new L.FeatureGroup().addTo(map);

     if (drawnItemsRef) {
    drawnItemsRef.current = drawnItems;
    }
    onDrawnChange && onDrawnChange(drawnItems.toGeoJSON());

    map.drawnItems   = drawnItems;
    map.editTools = new L.Editable(map);
    const drawControl = new L.Control.Draw({
      position: 'bottomleft',
      draw: {
        polyline: {
          allowIntersection: false,
          showLength: true,
          metric: false, // Use feet for length
          repeatMode: false,
          shapeOptions: {
            color: '#FF0000', // Red for polylines
            weight: 4,
            opacity: 1.0
          }
        },
        polygon: {
          allowIntersection: false,
          showArea: true,
          showLength: true,
          metric: false, // Use feet for length and area
          repeatMode: false,
          shapeOptions: {
            color: '#FFD700', // Gold for polygons
            weight: 4,
            opacity: 1.0,
            fillOpacity: 0.3 // Semi-transparent fill
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#32CD32', // Lime Green for rectangles
            weight: 4,
            opacity: 1.0,
            fillOpacity: 0.3 // Semi-transparent fill
          }
        },
        circle: {
          shapeOptions: {
            color: '#00FFFF', // Cyan for circles
            weight: 4,
            opacity: 1.0,
            fillOpacity: 0.3 // Semi-transparent fill
          }
        },
        marker: true, // Enable marker drawing
        circlemarker: false // Disable circle markers
      },
      edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true
      }
    });

    // Add the draw control to the map
    map.addControl(drawControl);

    // Handle feature creation
       // Handle feature creation
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      handleFeatureComplete(layer, e.layerType);
      onDrawnChange && onDrawnChange(drawnItems.toGeoJSON());
    });

    // Handle editing of shapes
 map.on(L.Draw.Event.EDITED, (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        clearFeatureLabels(layer); // Only clear labels of the edited feature (including area labels)
        handleFeatureComplete(layer, getLayerType(layer), true);
      });
      onDrawnChange && onDrawnChange(drawnItems.toGeoJSON());
    });
    map.on(L.Draw.Event.DELETED, (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        clearFeatureLabels(layer); // Remove the labels when a feature is deleted
      });
      onDrawnChange && onDrawnChange(drawnItems.toGeoJSON());
    });


    map.on(L.Draw.Event.EDITSTART, (e) => {
      const layers = e.layers || drawnItems;
      layers.eachLayer((layer) => {
        handleFeatureComplete(layer, getLayerType(layer), true); // Start real-time updates
      });
    });
    
    map.on(L.Draw.Event.EDITSTOP, (e) => {
      const layers = e.layers || drawnItems;
      layers.eachLayer((layer) => {
        layer.disableEdit(); // Stop editing mode
        layer.off('editable:vertex:drag'); // Clean up listeners
        layer.off('editable:vertex:dragend');
      });
    });
    
    // Adjust tooltips on zoom
    map.on('zoomend', () => {
      const zoomLevel = map.getZoom();
      adjustTooltipVisibility(zoomLevel);
      adjustTooltipSize(zoomLevel);
    });

    // Initial adjustment when component is mounted
    adjustTooltipVisibility(map.getZoom());
    adjustTooltipSize(map.getZoom());

    return () => {
      map.removeControl(drawControl);
    };
  }, [map]);

  // Function to adjust tooltip visibility based on zoom level
  const adjustTooltipVisibility = (zoomLevel) => {
    const minZoomForTooltips = 14;
    featureLabels.current.forEach((labels, layer) => {
      labels.forEach((label) => {
        const tooltipElement = label.getElement();
        if (tooltipElement) {
          tooltipElement.style.display = zoomLevel >= minZoomForTooltips ? 'block' : 'none';
        }
      });
    });
  };

  // Function to adjust tooltip size based on zoom level
  const adjustTooltipSize = (zoomLevel) => {
    const fontSizeClass = zoomLevel >= 16 ? 'label-large' :
                          zoomLevel >= 14 ? 'label-medium' : 'label-small';

    featureLabels.current.forEach((labels) => {
      labels.forEach((label) => {
        const tooltipElement = label.getElement();
        if (tooltipElement) {
          tooltipElement.classList.remove('label-small', 'label-medium', 'label-large');
          tooltipElement.classList.add(fontSizeClass);
        }
      });
    });
  };

  // Function to show marker coordinates as tooltip and allow copying to clipboard
  const showMarkerCoordinates = (layer) => {
    const latlng = layer.getLatLng();
    const tooltipText = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;

    const label = L.marker(latlng, {
      icon: L.divIcon({
        className: 'marker-label',
        html: `<div class="marker-label">${tooltipText}</div>`,
        iconSize: null,
        iconAnchor: [0, 0]
      })
    }).addTo(map);

    // Add a click event to copy the tooltip to the clipboard
    label.on('click', () => {
      navigator.clipboard.writeText(tooltipText)
        .then(() => {
          displayCopyNotification(); // Show the notification on the screen
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
        });
    });

    // Add the label to feature labels
    const labels = featureLabels.current.get(layer) || [];
    labels.push(label);
    featureLabels.current.set(layer, labels);

    // Initial visibility and size setup
    adjustTooltipVisibility(map.getZoom());
    adjustTooltipSize(map.getZoom());
  };

  // Function to show the timed notification when the tooltip is copied
  function displayCopyNotification() {
    const notification = document.createElement('div');
    notification.textContent = 'Coordinates copied to clipboard!';
    notification.className = 'copy-notification';

    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000); // Notification disappears after 2 seconds
  };

  // Function to handle the completion of drawing or editing a shape
  const handleFeatureComplete = (layer, layerType, isEditing = false) => {
    if (isEditing) {
      clearFeatureLabels(layer); // Clear old labels
  
      // Enable editing with real-time updates
      layer.enableEdit();
      layer.on('editable:vertex:drag', () => updateRealTimeMeasurements(layer));
      layer.on('editable:vertex:dragend', () => updateRealTimeMeasurements(layer)); // Final update on drag end
    }
  
    if (layerType === 'polyline') {
      showSegmentLengths(layer);
    } else if (layerType === 'polygon' || layerType === 'rectangle') {
      showPolygonArea(layer);
      showSegmentLengths(layer);
    } else if (layerType === 'circle') {
      showCircleDetails(layer);
    } else if (layerType === 'marker') {
      showMarkerCoordinates(layer);  // Show coordinates for markers
    }
  };

  const updateRealTimeMeasurements = (layer) => {
    clearFeatureLabels(layer); // Remove old labels for clean update
  
    // Determine the type of layer and display appropriate measurement
    const layerType = getLayerType(layer);
  
    if (layerType === 'polyline') {
      showSegmentLengths(layer); // Show lengths of polyline segments
    } else if (layerType === 'polygon' || layerType === 'rectangle') {
      showPolygonArea(layer); // Show area of polygon
      showSegmentLengths(layer); // Show segment lengths
    } else if (layerType === 'circle') {
      showCircleDetails(layer); // Show radius and area for circle
    } else if (layerType === 'marker') {
      showMarkerCoordinates(layer); // Show lat/lng for marker
    }
  };

  // Function to clear previous labels for the specific feature (both length and area labels)
  const clearFeatureLabels = (layer) => {
    const labels = featureLabels.current.get(layer); // Get the labels associated with the feature
    if (labels) {
      labels.forEach((label) => map.removeLayer(label)); // Remove each label from the map
      featureLabels.current.set(layer, []); // Clear the stored labels for this feature
    }
  };

  // Function to show the length of each segment of a polyline or polygon
  const showSegmentLengths = (layer) => {
    const latlngs = layer.getLatLngs();
    const labels = featureLabels.current.get(layer) || []; // Retrieve or initialize the label array for this feature

    if (Array.isArray(latlngs[0])) {
      // If the layer is a polygon, work with the outer ring
      latlngs[0].forEach((latlng, index) => {
        if (index < latlngs[0].length - 1) {
          labels.push(addLengthLabel(latlng, latlngs[0][index + 1], map)); // Add label to the map
        }
      });
      // Close the polygon by showing the length from last to first point
      labels.push(addLengthLabel(latlngs[0][latlngs[0].length - 1], latlngs[0][0], map));
    } else {
      // For polyline, work directly with the latlngs array
      latlngs.forEach((latlng, index) => {
        if (index < latlngs.length - 1) {
          labels.push(addLengthLabel(latlng, latlngs[index + 1], map)); // Add label to the map
        }
      });
    }

    featureLabels.current.set(layer, labels); // Store the labels for this feature
  };

  // Function to calculate and display the length between two points (converted to feet)
  const addLengthLabel = (latlngA, latlngB, map) => {
    const distanceInMeters = latlngA.distanceTo(latlngB); // Distance in meters
    const distanceInFeet = distanceInMeters * 3.28084; // Convert meters to feet
    const midpoint = L.latLng(
      (latlngA.lat + latlngB.lat) / 2,
      (latlngA.lng + latlngB.lng) / 2
    );

    // Format length label as "1234.5 Ft"
    const label = L.marker(midpoint, {
      icon: L.divIcon({
        className: 'distance-label',
        html: `<div class="distance-label">${distanceInFeet.toFixed(2)} Ft</div>`,
        iconSize: null, // Auto-size based on content
        iconAnchor: [0, 0] // Adjust position of the label
      })
    }).addTo(map); // Add the label to the map

    return label;
  };

  // Function to show the area of a polygon or rectangle in custom units (Acre-Kanal-Marla-Sq. Feet)
  const showPolygonArea = (layer) => {
    const latlngs = layer.getLatLngs()[0]; // Use the outer ring
    const areaInMeters = L.GeometryUtil.geodesicArea(latlngs); // Area in square meters
    const areaInSquareFeet = areaInMeters * 10.7639; // Convert square meters to square feet
    
    // Convert area to custom units (Acre-Kanal-Marla-Sq. Feet)
    const areaLabel = formatAreaCustomUnits(areaInSquareFeet); // Get the formatted area label

    const label = L.marker(layer.getBounds().getCenter(), {
      icon: L.divIcon({
        className: 'area-label',
        html: `<div class="area-label">${areaLabel}</div>`,
        iconSize: null, // Auto-size based on content
        iconAnchor: [0, 0] // Adjust position of the label
      })
    }).addTo(map); // Add the label to the map

    const labels = featureLabels.current.get(layer) || [];
    labels.push(label); // Add the area label to the list of labels
    featureLabels.current.set(layer, labels); // Store the labels for this feature
  };

  // Function to show the radius and area of a circle in custom units (Acre-Kanal-Marla-Sq. Feet)
  const showCircleDetails = (layer) => {
    const radiusInMeters = layer.getRadius(); // Radius in meters
    const areaInMeters = Math.PI * Math.pow(radiusInMeters, 2); // Area in square meters
    const areaInSquareFeet = areaInMeters * 10.7639; // Convert square meters to square feet

    // Convert area to custom units (Acre-Kanal-Marla-Sq. Feet)
    const areaLabel = formatAreaCustomUnits(areaInSquareFeet); // Get the formatted area label

    const center = layer.getLatLng();
    const label = L.marker(center, {
      icon: L.divIcon({
        className: 'circle-label',
        html: `<div class="circle-label">Radius: ${(radiusInMeters * 3.28084).toFixed(2)} Ft<br>${areaLabel}</div>`,
        iconSize: null, // Auto-size based on content
        iconAnchor: [0, 0] // Adjust position of the label
      })
    }).addTo(map); // Add the label to the map

    const labels = featureLabels.current.get(layer) || [];
    labels.push(label); // Add the circle label to the list of labels
    featureLabels.current.set(layer, labels); // Store the labels for this feature
  };

  // Function to format area in Acre-Kanal-Marla-Sq. Feet (A-K-M-Sq. Feet)
  const formatAreaCustomUnits = (areaSqFeet) => {
    const marlaInSqFeet = 272.25;
    const kanalInSqFeet = marlaInSqFeet * 20;
    const acreInSqFeet = kanalInSqFeet * 8;

    let acres = 0, kanals = 0, marlas = 0;
    let remainingSqFeet = areaSqFeet;

    // Calculate acres
    if (remainingSqFeet >= acreInSqFeet) {
      acres = Math.floor(remainingSqFeet / acreInSqFeet);
      remainingSqFeet = remainingSqFeet % acreInSqFeet;
    }

    // Calculate kanals
    if (remainingSqFeet >= kanalInSqFeet) {
      kanals = Math.floor(remainingSqFeet / kanalInSqFeet);
      remainingSqFeet = remainingSqFeet % kanalInSqFeet;
    }

    // Calculate marlas
    if (remainingSqFeet >= marlaInSqFeet) {
      marlas = Math.floor(remainingSqFeet / marlaInSqFeet);
      remainingSqFeet = remainingSqFeet % marlaInSqFeet;
    }

    // Return formatted string in the required format
    return `Area:<br>${acres}-Acre <br>${kanals}-Kanal <br>${marlas}-Marla <br>${remainingSqFeet.toFixed(2)}-Sq Feet`;
  };

  // Helper function to determine the type of a layer
  const getLayerType = (layer) => {
    if (layer instanceof L.Polygon) {
      return 'polygon';
    } else if (layer instanceof L.Polyline) {
      return 'polyline';
    } else if (layer instanceof L.Rectangle) {
      return 'rectangle';
    } else if (layer instanceof L.Circle) {
      return 'circle';
    } else if (layer instanceof L.Marker) {
      return 'marker'; // Add marker layer type handling
    }
    return null;
  };

  return null;
};

export default DrawControl;
