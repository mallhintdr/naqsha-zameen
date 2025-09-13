// src/App.js
import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  useCallback,
} from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Spinner, Container } from 'react-bootstrap';
import { useAuth } from './AuthContext';
import axios from 'axios';

import Header from './App/Header';
import Modals from './App/Modals';
import NavigationMenu from './App/NavigationMenu';
import ShiftMouzaForm from './Map Component/ShiftMouzaForm';
import GoToLocationForm from './Map Component/GoToLocationForm';

// These imports were missing
import UserRegistration from './UserRegistration';
import UserList from './UserList';
import UserDetail from './UserDetail';
import Statistics from './Statistics';
import Login from './Login';
import SubscriptionManagement from './SubscriptionManagement';
import ResetPassword from './ResetPassword';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
import './styles/navbar.css';
import './styles/dropdown.css';

// Lazy load MapComponent
const MapComponent = lazy(() => import('./Map Component/MapComponent'));

const App = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showGoToForm, setShowGoToForm] = useState(false);

  const [goToMarkers, setGoToMarkers] = useState([]);
  const mapRef = useRef(null);

  const [selectedMauza, setSelectedMauza] = useState('');
  const [geoJsonPath, setGeoJsonPath] = useState(null);
  const [murabbaOptions, setMurabbaOptions] = useState([]);
  const [selectedMurabba, setSelectedMurabba] = useState(null);
  const [shajraEnabled, setShajraEnabled] = useState(false);
  const [shajraVisible, setShajraVisible] = useState(false);

  const {
    user,
    loading,
    modalError,
    setModalError,
    warning,
    setWarning,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showWarningModal, setShowWarningModal] = useState(false);

  // For forcing MapComponent remount
  const [mapKey, setMapKey] = useState(0);

  // States for “Shift/Move Mauza”
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [canShiftMauza, setCanShiftMauza] = useState(false);
  const geoJsonLayerRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const [drawnLayerData, setDrawnLayerData] = useState(null);
  const [userLayers, setUserLayers] = useState([]);
  const [layerToLoad, setLayerToLoad] = useState(null);
  const [editingLayer, setEditingLayer] = useState(null);

  // Save map view (center/zoom) to restore after GeoJSON reload
  const [restoreView, setRestoreView] = useState(null);

  // Whenever user logs in/out, bump mapKey
  useEffect(() => {
    setMapKey((prev) => prev + 1);
  }, [user]);

  // Reset everything when user changes
  useEffect(() => {
    setSelectedMauza('');
    setMurabbaOptions([]);
    setSelectedMurabba(null);
    setGeoJsonPath(null);
    setCanShiftMauza(false);
    geoJsonLayerRef.current = null;
    setShowShiftForm(false);
  }, [user]);

  useEffect(() => {
    if (warning) setShowWarningModal(true);
    else setShowWarningModal(false);
  }, [warning]);

  const handleWarningModalClose = () => {
    setShowWarningModal(false);
    setWarning(null);
  };

  const clearCachedTiles = async () => {
    if ('indexedDB' in window) {
      const req = window.indexedDB.deleteDatabase('rasterDB');
      req.onsuccess = () => console.log('IndexedDB cache cleared.');
      req.onerror = (e) => console.error('IndexedDB cache error:', e.target.error);
    }
  };

  const clearAppData = async () => {
    await clearCachedTiles();
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight * 0.01}px`
      );
    };
    setVH();
    window.addEventListener('resize', setVH);
    return () => window.removeEventListener('resize', setVH);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') setShowGoToForm(false);
  }, [location]);

  const handleMauzaChange = useCallback(
    (mauza) => {
      if (!user) return;
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      setGeoJsonPath(
        `${apiBaseUrl}/api/geojson/${user.tehsil}/${mauza}?t=${Date.now()}`
      );
      setSelectedMauza(mauza);
      setMurabbaOptions([]);
      setSelectedMurabba(null);
      setShajraEnabled(false);
      setShajraVisible(false);
      clearCachedTiles();

      setShowShiftForm(false);
      setCanShiftMauza(false);
      geoJsonLayerRef.current = null;
    },
    [user]
  );

  const handleSetMurabbaOptions = useCallback((opts) => {
    setMurabbaOptions((prev) =>
      JSON.stringify(prev) !== JSON.stringify(opts) ? opts : prev
    );
  }, []);

  const handleGoToLocation = ({ lat, lng }) => {
    setGoToMarkers((prev) => [...prev, { id: Date.now(), coords: [lat, lng] }]);
    setShowGoToForm(false);
  mapRef.current?.flyTo([lat, lng], 18, {
      animate: true,
      duration: 2,
      easeLinearity: 0.5,
    });
    };
const handleDrawnLayerChange = useCallback((data) => {
    setDrawnLayerData(data);
  }, []);

  const fetchUserLayers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/user-layers`, { withCredentials: true });
      setUserLayers(res.data);
    } catch (err) {
      console.error('Failed to fetch user layers', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUserLayers();
  }, [fetchUserLayers]);

  const handleSaveLayer = async () => {
    if (!drawnLayerData || !drawnLayerData.features?.length) return;
    const name = prompt('Layer name?', editingLayer?.name || '');
    if (!name) return;
    try {
      if (editingLayer) {
        const res = await axios.put(
          `${process.env.REACT_APP_API_URL}/api/user-layers/${editingLayer._id}`,
          { name, geojson: drawnLayerData },
          { withCredentials: true }
        );
        setUserLayers((prev) => prev.map((l) => (l._id === res.data._id ? res.data : l)));
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/user-layers`,
          { name, geojson: drawnLayerData },
          { withCredentials: true }
        );
        setUserLayers((prev) => [...prev, res.data]);
      }
      setEditingLayer(null);
    } catch (err) {
      alert('Failed to save layer');
    }
  };

  const handleLoadLayer = (layer) => {
    setEditingLayer(layer);
    setLayerToLoad(layer.geojson);
  };

  const handleDeleteLayer = async (layer) => {
    if (!window.confirm('Delete layer?')) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/user-layers/${layer._id}`, { withCredentials: true });
      setUserLayers((prev) => prev.filter((l) => l._id !== layer._id));
    } catch (err) {
      alert('Failed to delete layer');
    }
  };

  const handleMapInit = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Called when GeoJsonLoader notifies that the layer is mounted
  const handleGeoJsonReady = (layer) => {
    console.log("[App] handleGeoJsonReady called. layer:", layer);
    geoJsonLayerRef.current = layer;
    setCanShiftMauza(!!layer && user?.userType === 'admin');

    // DEBUG: log first feature’s coords from the layer
    const features = layer.toGeoJSON().features;
    if (features.length) {
      console.log(
        "[App] First feature coords in new layer:",
        features[0].geometry.coordinates
      );
    }

    // Restore previous center/zoom if we saved one
    if (restoreView && mapRef.current) {
      console.log("[App] Restoring map view to:", restoreView);
      mapRef.current.setView(restoreView.center, restoreView.zoom, {
        animate: false,
      });
      setRestoreView(null);
    }
  };

  return (
    <Container
      fluid
      className="app-container px-0"
      style={{ height: 'calc(var(--vh,1vh)*100)', overflowY: 'auto' }}
    >
      <Header
        handleMenuToggle={() => setShowMenu((v) => !v)}
        handleProfileClick={() =>
          user ? setShowProfileModal(true) : navigate('/login')
        }
        handleMauzaChange={handleMauzaChange}
        selectedMauza={selectedMauza}
        setSelectedMauza={setSelectedMauza}
        murabbaOptions={murabbaOptions}
        handleMurabbaSelection={setSelectedMurabba}
        setShajraEnabled={setShajraEnabled}
        />

      <NavigationMenu
        showMenu={showMenu}
        handleMenuToggle={() => setShowMenu((v) => !v)}
        onGoToLocationClick={() => {
          if (location.pathname === '/') {
            setShowGoToForm(true);
            setShowMenu(false);
          }
        }}
        clearAppData={clearAppData}
        shajraEnabled={shajraEnabled}
        shajraVisible={shajraVisible}
        toggleShajraVisible={() => {
          if (shajraEnabled) {
            setShajraVisible((v) => !v);
            if (!shajraVisible) console.log('Loading Shajra...');
            else {
              console.log('Unloading Shajra.');
              clearCachedTiles();
            }
          }
        }}
        canShiftMauza={canShiftMauza}
        onOpenShiftModal={() => setShowShiftForm(true)}
        onSaveLayer={handleSaveLayer}
        drawnGeoJson={drawnLayerData}
        savedLayers={userLayers}
        onLoadLayer={handleLoadLayer}
        onDeleteLayer={handleDeleteLayer}
      />

      {loading ? (
        <div className="d-flex justify-content-center align-items-center h-100">
          <Spinner animation="border" />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="d-flex justify-content-center align-items-center h-100">
              <Spinner animation="border" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <MapComponent
                  mapKey={mapKey}
                  geoJsonUrl={geoJsonPath}
                  goToMarkers={goToMarkers}
                  onClearMarkers={() => setGoToMarkers([])}
                  setMurabbaOptions={handleSetMurabbaOptions}
                  selectedMurabba={selectedMurabba}
                  shajraVisible={shajraVisible}
                  user={user}
                  selectedMauza={selectedMauza}
                  onMapInit={handleMapInit}
                  onGeoJsonReady={handleGeoJsonReady}
                  onDrawnChange={handleDrawnLayerChange}
                  drawnItemsRef={drawnItemsRef}
                  userLayerToLoad={layerToLoad}
                />
              }
            />
            <Route path="/register" element={<UserRegistration />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/users/:userId/details" element={<UserDetail />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/subscription-management"
              element={<SubscriptionManagement />}
            />
             <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Suspense>
      )}

      {showGoToForm && location.pathname === '/' && (
        <GoToLocationForm
          onGoToLocation={handleGoToLocation}
          onClose={() => setShowGoToForm(false)}
          onClearMarkers={() => setGoToMarkers([])}
        />
      )}

      {user?.userType === 'admin' && showShiftForm && canShiftMauza && geoJsonLayerRef.current && (
        <ShiftMouzaForm
          tehsil={user.tehsil}
          mauza={selectedMauza}
          geoJsonLayer={geoJsonLayerRef.current}
          onClose={() => setShowShiftForm(false)}
          reloadGeoJson={() => {
            const apiBaseUrl = process.env.REACT_APP_API_URL || '';

            // 1) Save current map view (center & zoom) so we can restore it
            if (mapRef.current) {
              const center = mapRef.current.getCenter();
              const zoom = mapRef.current.getZoom();
              console.log("[App] Saving restoreView as:", { center, zoom });
              setRestoreView({ center, zoom });
            }

            // 2) Bump the URL with a cache-buster so GeoJsonLoader re-fetches
            setGeoJsonPath(
              `${apiBaseUrl}/api/geojson/${user.tehsil}/${selectedMauza}?t=${Date.now()}`
            );
          }}
        />
      )}

      <Modals
        showWarningModal={showWarningModal}
        setShowWarningModal={setShowWarningModal}
        warningContent={warning}
        onWarningModalClose={handleWarningModalClose}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        showChangePassword={showChangePassword}
        setShowChangePassword={setShowChangePassword}
        errorModal={modalError}
        setErrorModal={setModalError}
      />
    </Container>
  );
};

export default App;
