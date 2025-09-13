// src/NavigationMenu.js
import React from 'react';
import { Offcanvas, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NavigationMenu = ({
  showMenu,
  handleMenuToggle,
  onGoToLocationClick,
  clearAppData,
  onOpenShiftModal,    // Handler for opening the Shift/Transform Mouza form
  canShiftMauza = false, // Controls visibility of the Shift/Transform Mouza item
  onSaveLayer,
  drawnGeoJson,
  savedLayers = [],
  onLoadLayer,
  onDeleteLayer,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Helper to navigate and close the menu
  const go = (path) => {
    navigate(path);
    handleMenuToggle();
  };

   // Layer management no longer uses dropdown toggles

  return (
    <Offcanvas show={showMenu} onHide={handleMenuToggle} placement="start">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Geo Map Menu</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ minWidth: 220, maxWidth: 300 }}>
        <Nav className="flex-column">

          {/* Main map */}
          <Nav.Link onClick={() => go('/')}>🌍 Map</Nav.Link>

          {/* Go-to-location tool */}
          <Nav.Link onClick={onGoToLocationClick}>📍 Go To Location</Nav.Link>

          {/* Layer management */}
          {user && (
            <>
              <Nav.Item className="mt-2 mb-1"><strong>Layers</strong></Nav.Item>
              <Nav.Link
                onClick={() => { onSaveLayer(); handleMenuToggle(); }}
                disabled={
                  !drawnGeoJson ||
                  !drawnGeoJson.features?.length ||
                  savedLayers.length >= 10
                }
              >
                💾 Save Current
              </Nav.Link>
              {savedLayers.length > 0 ? (
                savedLayers.map(layer => (
                  <div key={layer._id} style={{ marginLeft: '1rem', marginBottom: '4px' }}>
                    <span>{layer.name}</span>
                    <button
                      style={{ marginLeft: '6px' }}
                      onClick={() => { onLoadLayer(layer); handleMenuToggle(); }}
                    >
                      Load
                    </button>
                    <button
                      style={{ marginLeft: '6px' }}
                      onClick={() => onDeleteLayer(layer)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <Nav.Item style={{ marginLeft: '1rem' }}>No Layers</Nav.Item>
              )}
            </>
          )}

          {/* Shift/Transform Mouza (only if a Mouza is loaded) */}
          {user && onOpenShiftModal && canShiftMauza && (
            <Nav.Link
              onClick={() => {
                onOpenShiftModal();
                handleMenuToggle();
              }}
            >
              ✨ Transform/Shift Mouza
            </Nav.Link>
          )}

          {/* Clear cache */}
          <Nav.Link
            onClick={() => { clearAppData(); handleMenuToggle(); }}
          >
            🔄 Clear Cache
          </Nav.Link>

          {/* Admin-only links */}
          {user?.userType === 'admin' && (
            <>
              <Nav.Link onClick={() => go('/register')}>📝 Register User</Nav.Link>
              <Nav.Link onClick={() => go('/users')}>👥 View Users</Nav.Link>
              <Nav.Link onClick={() => go('/stats')}>📊 Statistics</Nav.Link>
              <Nav.Link onClick={() => go('/subscription-management')}>🔄 Subscription Management</Nav.Link>
            </>
          )}

          {/* Auth links */}
          {user ? (
            <Nav.Link onClick={() => { logout(); handleMenuToggle(); }}>
              🔓 Logout
            </Nav.Link>
          ) : (
            <Nav.Link onClick={() => go('/login')}>🔐 Login</Nav.Link>
          )}
        </Nav>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default NavigationMenu;
