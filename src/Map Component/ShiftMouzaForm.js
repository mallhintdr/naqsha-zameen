import React, { useEffect, useState } from 'react';
import { Button, Form, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import './css/ShiftMouzaForm.css';

/**
 * Props:
 *   tehsil         – string (e.g. "Yazman")
 *   mauza          – string (e.g. "4 DNB")
 *   geoJsonLayer   – the Leaflet GeoJSON layer object
 *   onClose        – callback( ) to hide the form
 *   reloadGeoJson  – callback( ) to re‐fetch GeoJSON with a cache-buster
 */
const ShiftMouzaForm = ({ tehsil, mauza, geoJsonLayer, onClose, reloadGeoJson }) => {
  const [distance, setDistance] = useState('');
  const [direction, setDirection] = useState('North');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("[ShiftMouzaForm] Mounted with tehsil:", tehsil, "mauza:", mauza);
    // We are not using saveBBox right now (server endpoint returns 404).
    // If you implement /saveBBox on the server later, re-enable this block.
  }, [tehsil, mauza]);

  const handleMove = async () => {
    console.log(
      `[ShiftMouzaForm] handleMove clicked. distance: ${distance} direction: ${direction}`
    );
    if (!distance || isNaN(distance)) {
      setError('Please enter a valid distance (feet).');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const url = `${process.env.REACT_APP_API_URL}/api/geojson/${encodeURIComponent(
        tehsil
      )}/${encodeURIComponent(mauza)}/shift`;
      console.log("[ShiftMouzaForm] POST to:", url, "body:", {
        distance: parseFloat(distance),
        direction,
      });

      const response = await axios.post(
        url,
        { distance: parseFloat(distance), direction },
        { withCredentials: true }
      );
      console.log("[ShiftMouzaForm] Shift response data:", response.data.data);

      // Now that server has updated the GeoJSON, re-fetch it:
      reloadGeoJson();
    } catch (err) {
      console.error("[ShiftMouzaForm] Shift error:", err);
      setError(err.response?.data?.message || 'Failed to shift.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    console.log(
      `[ShiftMouzaForm] handleReset clicked for: ${tehsil} ${mauza}`
    );
    setError(null);
    setLoading(true);

    try {
      const url = `${process.env.REACT_APP_API_URL}/api/geojson/${encodeURIComponent(
        tehsil
      )}/${encodeURIComponent(mauza)}/reset`;
      console.log("[ShiftMouzaForm] POST to:", url);

      const response = await axios.post(url, {}, { withCredentials: true });
      console.log("[ShiftMouzaForm] Reset response data:", response.data.data);

      // Re-fetch GeoJSON after reset
      reloadGeoJson();
    } catch (err) {
      console.error("[ShiftMouzaForm] Reset error:", err);
      setError(err.response?.data?.message || 'Failed to reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shift-form-container">
      <Card className="shift-form-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <strong>Transform / Shift Mouza</strong>
            <Button variant="light" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </Card.Header>

        <Card.Body>
          {(!tehsil || !mauza) && (
            <Alert variant="warning">
              Missing tehsil or mauza. Props are: tehsil = {tehsil}, mauza = {mauza}. Please reload and
              try again.
            </Alert>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          <Form>
            <Form.Group controlId="shiftDistance">
              <Form.Label>Distance (feet)</Form.Label>
              <Form.Control
                type="number"
                placeholder="e.g. 30"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                disabled={loading || !tehsil || !mauza}
              />
            </Form.Group>

            <Form.Group controlId="shiftDirection" className="mt-2">
              <Form.Label>Direction</Form.Label>
              <Form.Select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                disabled={loading || !tehsil || !mauza}
              >
                <option>North</option>
                <option>South</option>
                <option>East</option>
                <option>West</option>
              </Form.Select>
            </Form.Group>

            <div className="mt-3 d-flex justify-content-between">
              <Button
                variant="primary"
                onClick={handleMove}
                disabled={loading || !tehsil || !mauza}
              >
                {loading ? 'Moving…' : 'Move'}
              </Button>
              <Button
                variant="warning"
                onClick={handleReset}
                disabled={loading || !tehsil || !mauza}
              >
                {loading ? 'Resetting…' : 'Reset'}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ShiftMouzaForm;
