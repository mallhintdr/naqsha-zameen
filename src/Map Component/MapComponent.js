// src/Map Component/MapComponent.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import LocateControl from './LocateControl';
import LayerControl from './LayerControl';
import DrawControl from './DrawControl';
import SearchControl from './SearchControl';
import GeoJsonLoader from './Map/GeoJsonLoader';import ShiftMouzaForm from './ShiftMouzaForm';
import './css/GeoJsonLoader.css';
import './css/DrawControl.css';
import './css/MapComponent.css';
import './css/LayerControl.css';
import Compass from './CompassControl';
import L from 'leaflet';
import { openDB } from 'idb';
import 'leaflet-simple-map-screenshoter';
import 'leaflet-rotate';

import {
  addMeasurementLabels,
  adjustTooltipVisibility,
  adjustTooltipSize,
} from './measurementUtils';

/* ---------- custom marker icon ---------- */
const customIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  tooltipAnchor: [0, -35],
});

/* ---------- IndexedDB helpers for tile caching ---------- */
const dbPromise = openDB('rasterDB', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('tiles')) {
      db.createObjectStore('tiles');
    }
  },
});
const storeTileInIndexedDB = async (key, blob) => {
  const db = await dbPromise;
  await db.put('tiles', blob, key);
  console.log(`Tile ${key} cached in IndexedDB.`);
};
const getTileFromIndexedDB = async (key) => {
  const db = await dbPromise;
  return db.get('tiles', key);
};
const deleteCachedTiles = async () => {
  const db = await dbPromise;
  const tx = db.transaction('tiles', 'readwrite');
  const store = tx.objectStore('tiles');
  const keys = await store.getAllKeys();
  for (const key of keys) await store.delete(key);
  console.log('All cached tiles have been deleted.');
};
const fetchAndCacheTile = async (tileUrl) => {
  try {
    const cached = await getTileFromIndexedDB(tileUrl);
    if (cached) return URL.createObjectURL(cached);

    const res = await fetch(tileUrl);
    if (!res.ok) {
      console.error(`Failed to fetch tile: ${tileUrl}`);
      return null;
    }
    const blob = await res.blob();
    await storeTileInIndexedDB(tileUrl, blob);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error(`Error fetching tile ${tileUrl}:`, err);
    return null;
  }
};

/* ======================================================================= */

const MapComponent = ({
  mapKey,
  geoJsonUrl,        // used for "geojson-only" mode
  goToMarkers,
  onClearMarkers,
  setMurabbaOptions,
  selectedMurabba,
  user,
  selectedMauza,     // relevant in "shajra" mode
  showClearCacheOption,
  onMapInit,         // passes Leaflet map instance back to App
  onGeoJsonReady,    // <<< NEW: callback once GeoJSON layer is added
  onDrawnChange,
  drawnItemsRef: externalDrawnRef,
  userLayerToLoad,
}) => {
  /* -------- convenience strings -------- */
  const tehsilStr = user?.tehsil ?? '';
  const mauzaStr = selectedMauza ?? '';
  const encodedBase = encodeURIComponent('Shajra Parcha');
  const encodedTehsil = encodeURIComponent(tehsilStr);
  const encodedMauza = encodeURIComponent(mauzaStr);
  const cacheBuster = useMemo(() => Date.now(), [selectedMauza]);

  /* -------- mode: geojson-only | shajra -------- */
  const [dataMode, setDataMode] = useState(null);

  /* -------- refs & local state -------- */
  const mapRef = useRef(null);
  const mustateelLayers = useRef([]);

  // ALWAYS call useRef here, then choose between external vs. internal
  const internalDrawnRef = useRef(null);
  const drawnItemsRef = externalDrawnRef || internalDrawnRef;

  const [drawnGeoJson, setDrawnGeoJson] = useState(null);
  const [boundsFit, setBoundsFit] = useState(false);
  const [zoomedMurabba, setZoomedMurabba] = useState(null);

  /* ───────────────────────────────────────────
   * Hold the Leaflet GeoJSON layer instance
   * so we can pass it into ShiftMouzaForm
   * ─────────────────────────────────────────── */
  const [geoJsonLayerInstance, setGeoJsonLayerInstance] = useState(null);

  /* shajra tile-layer controls */
   const [shajraLayer, setShajraLayer] = useState(null);
  const [shajraOpacity, setShajraOpacity] = useState(1);
  const [shajraExists, setShajraExists] = useState(false);
  // ← Re-introduced: track visibility toggle
  const [shajraVisible, setShajraVisible] = useState(false);
  const [initialTileBoundsFitted, setInitialTileBoundsFitted] = useState(false);
  const [shajraMeta, setShajraMeta] = useState(null);

  const handleDrawnChange = useCallback(
    (geojson) => {
      setDrawnGeoJson(geojson);
      if (typeof onDrawnChange === 'function') {
        onDrawnChange(geojson);
      }
    },
    [onDrawnChange]
  );

  const measurementLabelsRef = useRef(new Map());

  useEffect(() => {
    if (!userLayerToLoad || !drawnItemsRef.current) return;
    const map = mapRef.current;
    drawnItemsRef.current.clearLayers();

    measurementLabelsRef.current.forEach((labels) => {
      labels.forEach((lbl) => map && map.removeLayer(lbl));
    });
    measurementLabelsRef.current = new Map();

    const styleFeature = (feature) => {
      const type = feature.geometry?.type;
      if (type === 'LineString' || type === 'MultiLineString') {
        return { color: '#FF0000', weight: 4, opacity: 1.0 };
      }
      if (type === 'Polygon' || type === 'MultiPolygon') {
        return { color: '#FFD700', weight: 4, opacity: 1.0, fillOpacity: 0.3 };
      }
      return { color: '#32CD32', weight: 4, opacity: 1.0, fillOpacity: 0.3 };
    };

    L.geoJSON(userLayerToLoad, {
      style: styleFeature,
      pointToLayer: (feature, latlng) => L.marker(latlng),
    }).eachLayer((layer) => {
      drawnItemsRef.current.addLayer(layer);
      if (map) addMeasurementLabels(layer, map, measurementLabelsRef.current);
    });

    handleDrawnChange(drawnItemsRef.current.toGeoJSON());

    if (map && drawnItemsRef.current.getLayers().length) {
      const b = drawnItemsRef.current.getBounds();
      if (b.isValid()) map.fitBounds(b);
    }

    const onZoom = () => {
      const z = map.getZoom();
      adjustTooltipVisibility(measurementLabelsRef.current, z);
      adjustTooltipSize(measurementLabelsRef.current, z);
    };
    if (map) {
      map.on('zoomend', onZoom);
      onZoom();
    }

    return () => {
      if (map) map.off('zoomend', onZoom);
    };
  }, [userLayerToLoad, handleDrawnChange, drawnItemsRef]);

  /* -------- label GeoJSON for murabba dropdown -------- */
  const [labelGeoJsonData, setLabelGeoJsonData] = useState(null);
  const [tilesLoaded, setTilesLoaded] = useState(true);

  /* =====================================================================
   *  MapUpdater – tracks zoom, stores first map ref
   * =================================================================== */
  const MapUpdater = ({ mapRef, setTilesLoaded }) => {
    const map = useMap();

           useEffect(() => {
      if (!mapRef.current || mapRef.current !== map) {
        mapRef.current = map;
        mapRef.current._screenshotControlAdded = false;
      }

      let screenshotControl = map.screenshotControl || null;
      let tileLoadingLayers = [];

      function setupTileListeners() {
        let loading = 0;
        const update = () => setTilesLoaded(loading === 0);

        tileLoadingLayers.forEach((layer) => {
          layer.off('loading');
          layer.off('load');
        });
        tileLoadingLayers = [];

        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            tileLoadingLayers.push(layer);
            layer.on('loading', () => {
              loading++;
              update();
            });
            layer.on('load', () => {
              loading = Math.max(loading - 1, 0);
              update();
            });

            if (layer._tiles) {
              const tilesLeft = Object.values(layer._tiles).filter((t) => !t.loaded).length;
              if (tilesLeft === 0) setTilesLoaded(true);
            }
          }
        });
      }

      setupTileListeners();

      //if (!mapRef.current._screenshotControlAdded) {
      //  screenshotControl = L.simpleMapScreenshoter({
       //   position: 'topleft',
         // screenName: `screenshot-${Date.now()}`,
         // preventCrossOrigin: false,
        //  domtoimageOptions: {
        //    bgcolor: '#fff',
          //  height: document.querySelector('.map-container')?.offsetHeight || 800,
            //width: document.querySelector('.map-container')?.offsetWidth || 1200,
           // style: {
             // transform: 'scale(1.2)',
//              transformOrigin: 'top left',
  //          },
    ////      },
        //});

      // map.whenReady(() => {
      //    screenshotControl.addTo(map);
      //    map.screenshotControl = screenshotControl;
      //    mapRef.current._screenshotControlAdded = true;
      //  });
     // }
 /* Screenshot capture button disabled */
      if (!mapRef.current._screenshotControlAdded) {
        // Intentionally do not create or add the screenshot control
        mapRef.current._screenshotControlAdded = true;
      }
      const onLayerAdd = (e) => {
        if (e.layer instanceof L.TileLayer) setupTileListeners();
      };
      map.on('layeradd', onLayerAdd);

      return () => {
        map.off('layeradd', onLayerAdd);
        tileLoadingLayers.forEach((layer) => {
          layer.off('loading');
          layer.off('load');
        });
        if (screenshotControl) {
          map.removeControl(screenshotControl);
          map.screenshotControl = null;
          mapRef.current._screenshotControlAdded = false;
        }
      };
    }, [map, setTilesLoaded]);

    return null;
  };
    /* =====================================================================
   *  Decide mode (geojson-only vs shajra) whenever Mauza changes
   *  -> check for existence of shajra metadata and switch modes
   * =================================================================== */
  useEffect(() => {
    if (!tehsilStr || !selectedMauza) return;
    const metaPath = `/${encodedBase}/${encodedTehsil}/${encodedMauza}.json?t=${cacheBuster}`;
    const load = async () => {
      setShajraMeta(null);
      try {
        const res = await fetch(metaPath, { cache: 'no-store' });
        const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
        if (res.ok && isJson) {
          const data = await res.json();
          setShajraMeta(data);
          setDataMode('shajra');
          setShajraExists(true);
          setShajraVisible(true);
          console.log(`Shajra metadata found for ${mauzaStr} – auto-loading`);
        } else {
          setShajraMeta(null);
          setDataMode('geojson-db');
          setShajraExists(false);
          setShajraVisible(false);
        }
      } catch {
        setShajraMeta(null);
        setDataMode('geojson-db');
        setShajraExists(false);
        setShajraVisible(false);
      }
    };
    load();
  }, [tehsilStr, selectedMauza, mauzaStr]);

  /* =====================================================================
   *  SHAJRA mode – check for metadata to auto-toggle layer
   * =================================================================== */
  const tileUrlTemplate =
    dataMode === 'shajra' && selectedMauza
      ? `/${encodedBase}/${encodedTehsil}/${encodedMauza}/{z}/{x}/{y}.png`
      : null;
  const labelGeoJsonUrl =
    dataMode === 'shajra' && selectedMauza
      ? `/${encodedBase}/${encodedTehsil}/${encodedMauza}.geojson?t=${cacheBuster}`
      : null;
  
  /* Reset shajra layer on Mauza change */
  useEffect(() => {
    if (dataMode !== 'shajra') return;
    setInitialTileBoundsFitted(false);
    const map = mapRef.current;
    if (map && shajraLayer) {
      map.removeLayer(shajraLayer);
      setShajraLayer(null);
    }
  }, [dataMode, selectedMauza]);

  /* Create/remove shajra tile layer */
  useEffect(() => {
    if (dataMode !== 'shajra') return;
    const map = mapRef.current;
    if (!map || !tileUrlTemplate) return;

    if (shajraVisible) {
      if (!shajraLayer) {
        const tLayer = L.tileLayer('', {
          opacity: shajraOpacity,
          maxNativeZoom: 20,
          maxZoom: 21,
          tileSize: 256,
          zIndex: 10,
        });
        tLayer.createTile = (coords, done) => {
          const { x, y, z } = coords;
          const url = `/${encodedBase}/${encodedTehsil}/${encodedMauza}/${z}/${x}/${y}.png`;
          const img = new Image();
          fetchAndCacheTile(url).then((blobUrl) => {
            img.src = blobUrl || url;
            img.onload = () => done(null, img);
            img.onerror = () => done(new Error(`Failed to load tile ${url}`));
          });
          return img;
        };
           /* Zoom to metadata bounds once */
        if (shajraMeta?.bounds) {
          let bounds = shajraMeta.bounds;
            if (typeof bounds === 'string') {
              const p = bounds.split(',').map(Number);
              if (p.length === 4 && p.every((n) => !isNaN(n)))
                bounds = [
                  [p[1], p[0]],
                  [p[3], p[2]],
                ];
            } else if (bounds.topLeft) {
              const lats = [
                bounds.topLeft[0],
                bounds.topRight[0],
                bounds.bottomRight[0],
                bounds.bottomLeft[0],
              ];
              const lngs = [
                bounds.topLeft[1],
                bounds.topRight[1],
                bounds.bottomRight[1],
                bounds.bottomLeft[1],
              ];
              bounds = [
                [Math.min(...lats), Math.min(...lngs)],
                [Math.max(...lats), Math.max(...lngs)],
              ];
            }
            if (Array.isArray(bounds) && bounds.length === 2 && !initialTileBoundsFitted) {
              map.fitBounds(bounds);
              setInitialTileBoundsFitted(true);
              setBoundsFit(true);
            }
        }
        tLayer.addTo(map);
        setShajraLayer(tLayer);
      }
    } else if (shajraLayer) {
      map.removeLayer(shajraLayer);
      setShajraLayer(null);
    }
  }, [
    dataMode,
    shajraVisible,
    shajraLayer,
    shajraOpacity,
    initialTileBoundsFitted,
    tehsilStr,
    mauzaStr,
    tileUrlTemplate,
    shajraMeta,
  ]);

  /* update opacity */
  useEffect(() => {
    if (shajraLayer) shajraLayer.setOpacity(shajraOpacity);
  }, [shajraOpacity, shajraLayer]);

  /* ---------------------------------------------------------------------
   * Load label GeoJSON once → set murabba dropdown
   * ------------------------------------------------------------------- */
  useEffect(() => {
    if (dataMode !== 'shajra' || !labelGeoJsonUrl) return;
    const load = async () => {
      try {
        const res = await fetch(labelGeoJsonUrl, { cache: 'no-store' });
        const txt = await res.text();
        const data = JSON.parse(txt);
        const murabbas = Array.from(
          new Set(
            data.features
              .filter((f) => f.properties?.Murabba_No != null)
              .map((f) => String(f.properties.Murabba_No))
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setMurabbaOptions(murabbas);
        setLabelGeoJsonData(data);

        // ----- fit map to overall point extents -----
        const map = mapRef.current;
        if (map) {
          const pts = data.features
            .filter((f) => f.geometry?.type === 'Point')
            .map((f) => f.geometry.coordinates);
          if (pts.length) {
            const lats = pts.map((p) => p[1]);
            const lngs = pts.map((p) => p[0]);
            const bounds = L.latLngBounds(
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)]
            );
            if (bounds.isValid()) {
              map.fitBounds(bounds);
              setBoundsFit(true);
            }
          }
        }
      } catch (err) {
        console.error('Error loading label JSON:', err);
      }
    };
    load();
  }, [dataMode, labelGeoJsonUrl, setMurabbaOptions]);

  /* ---------------------------------------------------------------------
   * Zoom to selected murabba
   * ------------------------------------------------------------------- */
  useEffect(() => {
    if (dataMode !== 'shajra') return;
    if (!selectedMurabba || selectedMurabba === zoomedMurabba) return;
    const map = mapRef.current;
    if (!map || !labelGeoJsonData) return;

    const feat = labelGeoJsonData.features.find(
      (f) => String(f.properties?.Murabba_No) === String(selectedMurabba)
    );
    if (feat) {
      if (feat.geometry.type === 'Point') {
        const [lng, lat] = feat.geometry.coordinates;
        map.flyTo([lat, lng], 18, {
          animate: true,
          duration: 2,
          easeLinearity: 0.5,
        });
      } else {
        const tmp = L.geoJSON(feat);
        if (tmp.getBounds().isValid()) map.fitBounds(tmp.getBounds());
      }
      setZoomedMurabba(selectedMurabba);
    }
  }, [dataMode, selectedMurabba, labelGeoJsonData, zoomedMurabba]);

  /* ------------------------------------------------------------------
   * Animate to newest Go-To marker (once per addition)
   * ---------------------------------------------------------------- */
   useEffect(() => {
    if (!mapRef.current || goToMarkers.length === 0) return;
    const { coords } = goToMarkers[goToMarkers.length - 1];
    mapRef.current.flyTo(coords, 18, {
      animate: true,
      duration: 2,
      easeLinearity: 0.5,
    });
  }, [goToMarkers]);

  /* ------------------------------------------------------------------
   * Stable callback for GeoJsonLoader
   * ---------------------------------------------------------------- */
  const stableGeoJsonReady = useCallback(
    (layer) => {
      // Store the layer instance so the shift form can use it:
      setGeoJsonLayerInstance(layer);

      // Forward to parent if needed:
      if (typeof onGeoJsonReady === 'function') {
        onGeoJsonReady(layer);
      }
    },
    [onGeoJsonReady]
  );

  /* =====================================================================
   *  Render
   * =================================================================== */
  return (
    <div className="map-container">
      <MapContainer
        key={mapKey}                 // <-- ensures GeoJsonLoader reloads when mapKey changes
        center={[30, 71]}
        zoom={5}
        maxZoom={21}
        zoomSnap={0.5}
        zoomDelta={0.55}
        wheelPxPerZoomLevel={150}
        style={{ height: '100%', width: '100%' }}
        whenCreated={onMapInit}
        rotate={true}
      >
        {/* 1) Render screenshot control first */}
        <MapUpdater mapRef={mapRef} setTilesLoaded={setTilesLoaded} />

        {/* 2) Location control now appears below the capture button */}
        <LocateControl />

        {/* 3) Search control placed on the left below the capture button */}
        <SearchControl />
        <LayerControl />
        <DrawControl drawnItemsRef={drawnItemsRef} onDrawnChange={handleDrawnChange} />

        {dataMode === 'geojson-db' && (
          <GeoJsonLoader
            geoJsonUrl={geoJsonUrl}
            mustateelLayers={mustateelLayers}
            setMurabbaOptions={setMurabbaOptions}
            onMurabbaSelect={selectedMurabba}
            setBoundsFit={setBoundsFit}
            resetFlag={mapKey}       // forces a full reload when mapKey changes
            geoJsonReady={stableGeoJsonReady}
          />
        )}

        {/* --------------- Go-To markers --------------- */}
        {goToMarkers.map(({ id, coords }) => (
          <Marker key={id} position={coords} icon={customIcon}>
            <Tooltip permanent>{`Lat: ${coords[0]}, Lng: ${coords[1]}`}</Tooltip>
          </Marker>
        ))}

        <Compass />
      </MapContainer>

      {!tilesLoaded && (
        <div className="map-loading-spinner-overlay">
          <div className="map-loading-spinner"></div>
        </div>
      )}

      {/* ---------- shajra opacity slider ---------- */}
      {dataMode === 'shajra' && shajraVisible && (
        <div className="vertical-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={shajraOpacity}
            onChange={(e) => setShajraOpacity(Number(e.target.value))}
            className="vertical-opacity-slider"
          />
        </div>
      )}

      {/* ---------- clear-cache button ---------- */}
      {showClearCacheOption && (
        <div className="clear-cache-container">
          <button onClick={deleteCachedTiles} className="clear-cache-button">
            Clear Cached Tiles
          </button>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
