import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import throttle from "lodash/throttle";
import "./css/CompassControl.css";
import compassIconActive from "./images/north.png"; // Active compass icon
import compassIconInactive from "./images/north-static.png"; // Inactive/static north icon

// Extend Leaflet Control for a compass
const CompassControl = L.Control.extend({
  onAdd: function (map) {
    const compassDiv = L.DomUtil.create("div", "leaflet-compass-icon");
    L.DomEvent.disableClickPropagation(compassDiv);
    L.DomEvent.disableScrollPropagation(compassDiv);
    compassDiv.style.backgroundImage = `url('${compassIconInactive}')`;

    let isActive = false;
    let magneticDeclination = 0;
    let orientationHandler = null;

    // Smoothly rotate the compass icon
    const applyRotation = (deg) => {
      requestAnimationFrame(() => {
        compassDiv.style.transform = `rotate(${deg}deg)`;
      });
      if (typeof map.setBearing === "function") {
        map.setBearing((-deg + 360) % 360);
      }
    };

    // Compute heading and rotate only the compass control
    const updateCompass = (evt) => {
      let heading;
      if (evt.absolute && evt.alpha !== null) {
        heading = evt.alpha;
      } else if (evt.webkitCompassHeading !== undefined) {
        heading = evt.webkitCompassHeading;
      } else if (evt.alpha !== null) {
        heading = (360 - evt.alpha) % 360;
      } else {
        return;
      }

      heading = (heading + magneticDeclination + 360) % 360;
      applyRotation(-heading);
    };

    // Fetch magnetic declination for current location
    const fetchDeclination = async () => {
      try {
        if (!navigator.geolocation) throw new Error("Geolocation unsupported");
        const { coords } = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        const resp = await fetch(
          `https://api.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${coords.latitude}&lon1=${coords.longitude}&resultFormat=json`
        );
        if (!resp.ok) throw new Error("Declination API failed");
        const json = await resp.json();
        magneticDeclination = json.result[0]?.declination || 0;
      } catch (e) {
        console.warn("Declination fetch failed:", e.message);
        magneticDeclination = 0;
      }
    };

    // Handle iOS 13+ permission model
    const requestOrientationPermission = async () => {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        return await DeviceOrientationEvent.requestPermission();
      }
      return "granted";
    };

    // Toggle compass activation
    const toggleCompass = async () => {
      if (isActive) {
        window.removeEventListener("deviceorientation", orientationHandler, true);
        orientationHandler = null;
        compassDiv.style.transform = "rotate(0deg)";
        compassDiv.style.backgroundImage = `url('${compassIconInactive}')`;
      }       
        if (typeof map.setBearing === "function") {
          map.setBearing(0);
        }
      else {
        compassDiv.style.backgroundImage = `url('${compassIconActive}')`;
        await fetchDeclination();
        const perm = await requestOrientationPermission();
        if (perm !== "granted") throw new Error("Permission denied");
        orientationHandler = throttle(updateCompass, 100);
        window.addEventListener("deviceorientation", orientationHandler, true);
      }
      isActive = !isActive;
    };

    // Click toggles compass
    compassDiv.addEventListener("click", () =>
      toggleCompass().catch((e) => {
        console.warn("Compass error:", e);
        isActive = false;
        compassDiv.title = "Compass unavailable";
        compassDiv.style.backgroundImage = `url('${compassIconInactive}')`;
      })
    );

    // Auto-enable on mobile devices when permission is not required
    if (
      /Mobi|Android/i.test(navigator.userAgent) &&
      typeof DeviceOrientationEvent.requestPermission !== "function"
    ) {
      toggleCompass().catch(() => {});
    }
    return compassDiv;
  },
});

// React component to hook into Leaflet map
const CompassControlComponent = () => {
  const map = useMap();

  useEffect(() => {
    const control = new CompassControl({ position: "topright" });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
};

export default CompassControlComponent;