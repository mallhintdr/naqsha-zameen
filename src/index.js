import React from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot from react-dom/client
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import 'leaflet/dist/leaflet.css';  // Leaflet CSS
import 'leaflet-draw/dist/leaflet.draw.css';  // Leaflet-Draw CSS
import 'bootstrap/dist/css/bootstrap.min.css';  // Bootstrap CSS
import '@fortawesome/fontawesome-free/css/all.css'; // FontAwesome CSS
import { AuthProvider } from './AuthContext'; // Import the AuthProvider

const rootElement = document.getElementById('root');
const root = createRoot(rootElement); // Use createRoot correctly

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
