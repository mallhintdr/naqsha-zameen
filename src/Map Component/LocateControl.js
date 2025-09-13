// src/Map Component/LocateControl.js

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import locationIcon from './images/location.png';
import './css/LocateControl.css';

/**
 * LocateControl with toggle functionality:
 * - Clicking the button starts tracking and shows the user's live location.
 * - Clicking again stops tracking and removes the location marker.
 */

const LocateControl = L.Control.extend({
  onAdd: function (map) {
    this._userMarker = null;
    this._accuracyCircle = null;
    this._watchId = null;
    this._intervalId = null;
    this._hasZoomedToLocation = false;
    this._locatingMessage = null;

    const button = L.DomUtil.create('button', 'leaflet-location-icon');
    button.title = 'Track My Live Location';
    button.style.backgroundImage = `url('${locationIcon}')`;

    const calculateAverageLocation = (locations) => {
      const total = locations.reduce(
        (acc, loc) => ({
          latitude: acc.latitude + loc.latitude,
          longitude: acc.longitude + loc.longitude,
          accuracy: acc.accuracy + loc.accuracy,
        }),
        { latitude: 0, longitude: 0, accuracy: 0 }
      );
      const count = locations.length;
      return {
        latitude: total.latitude / count,
        longitude: total.longitude / count,
        accuracy: total.accuracy / count,
      };
    };

    const updateLocationDisplay = (latitude, longitude, accuracy) => {
      if (this._userMarker) {
        this._userMarker.setLatLng([latitude, longitude]);
      } else {
        const blinkingCircle = L.divIcon({
          className: 'blinking-location',
          html: `<div class="blinking-circle"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        this._userMarker = L.marker([latitude, longitude], {
          icon: blinkingCircle,
        }).addTo(map);
      }

      if (this._accuracyCircle) {
        this._accuracyCircle.setLatLng([latitude, longitude]);
        this._accuracyCircle.setRadius(accuracy);
      } else {
        this._accuracyCircle = L.circle([latitude, longitude], {
          radius: accuracy,
          className: 'leaflet-accuracy-circle',
        }).addTo(map);
      }

      if (!this._hasZoomedToLocation) {
        map.flyTo([latitude, longitude], 18, {
          animate: true,
          duration: 2,
          easeLinearity: 0.5,
        });
        this._hasZoomedToLocation = true;
      }
    };

    let locationBuffer = [];

    const startTracking = () => {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      if (!this._locatingMessage) {
        this._locatingMessage = L.DomUtil.create('div', 'locating-message', map._container);
        this._locatingMessage.innerText = 'Acquiring location…';
      }

      locationBuffer = [];
      this._watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          locationBuffer.push({ latitude, longitude, accuracy });

          if (this._locatingMessage) {
            map._container.removeChild(this._locatingMessage);
            this._locatingMessage = null;
          }

          if (locationBuffer.length > 50) {
            locationBuffer.shift();
          }
        },
        (error) => {
          console.error('Error retrieving location:', error.message);
          alert('Unable to retrieve location. Ensure GPS or internet is active.');
          if (this._locatingMessage) {
            map._container.removeChild(this._locatingMessage);
            this._locatingMessage = null;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      this._intervalId = setInterval(() => {
        if (locationBuffer.length === 0) return;
        const { latitude, longitude, accuracy } = calculateAverageLocation(locationBuffer);
        updateLocationDisplay(latitude, longitude, accuracy);
        locationBuffer = [];
      }, 5000);
    };

    const stopTracking = () => {
      if (this._watchId !== null) {
        navigator.geolocation.clearWatch(this._watchId);
        this._watchId = null;
      }
      if (this._intervalId !== null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      locationBuffer = [];
      if (this._userMarker) {
        map.removeLayer(this._userMarker);
        this._userMarker = null;
      }
      if (this._accuracyCircle) {
        map.removeLayer(this._accuracyCircle);
        this._accuracyCircle = null;
      }
      if (this._locatingMessage) {
        map._container.removeChild(this._locatingMessage);
        this._locatingMessage = null;
      }
      this._hasZoomedToLocation = false;
      L.DomUtil.removeClass(button, 'leaflet-location-icon-active');
      button.title = 'Track My Live Location';
    };

    this._stopTracking = stopTracking;

    const onButtonClick = () => {
      if (this._watchId === null) {
        this._hasZoomedToLocation = false;
        L.DomUtil.addClass(button, 'leaflet-location-icon-active');
        button.title = 'Locating…';
        startTracking();
      } else {
        stopTracking();
      }
    };

    L.DomEvent.on(button, 'click', onButtonClick);

    return button;
  },

  onRemove: function (map) {
    if (this._stopTracking) {
      this._stopTracking();
    }
  },
});

const LocateControlComponent = () => {
  const map = useMap();
  useEffect(() => {
    const control = new LocateControl({ position: 'topleft' });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
};

export default LocateControlComponent;
