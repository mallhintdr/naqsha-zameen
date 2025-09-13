import React, { useState } from 'react';
import '../styles/GoToLocationForm.css';

const GoToLocationForm = ({ onGoToLocation, onClose, onClearMarkers }) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return setErrorMessage('Please enter valid numbers for both fields.');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return setErrorMessage(
        'Latitude must be between -90 and 90; Longitude between -180 and 180.'
      );
    }

    setErrorMessage('');
    onGoToLocation({ lat, lng });
    // optional: reset fields here or in parent
  };

  const handleCancel = () => {
    setLatitude('');
    setLongitude('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="goto-location-form" role="dialog" aria-modal="true">
      <h3>Go To Location</h3>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="lat">Latitude</label>
          <input
            id="lat"
            type="number"
            step="any"
            min="-90"
            max="90"
            value={latitude}
            onChange={e => setLatitude(e.target.value)}
            required
          />

          <label htmlFor="lng">Longitude</label>
          <input
            id="lng"
            type="number"
            step="any"
            min="-180"
            max="180"
            value={longitude}
            onChange={e => setLongitude(e.target.value)}
            required
          />
        </div>
        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="form-buttons">
          <button type="submit" className="btn-go-to small-button">
            Go To
          </button>
          <button
            type="button"
            onClick={() => {
              setLatitude('');
              setLongitude('');
              onClearMarkers();
            }}
            className="btn-clear small-button"
          >
            Clear All Markers
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn-cancel small-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoToLocationForm;
