import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './css/SearchControl.css';

const SearchControl = L.Control.extend({
  onAdd: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-search-container');

    const button = L.DomUtil.create('button', 'search-btn', container);
    button.innerHTML = '🔍';
    button.title = 'Search place';

    const form = L.DomUtil.create('div', 'search-form hidden', container);
    const input = L.DomUtil.create('input', 'search-input', form);
    input.type = 'text';
    input.placeholder = 'Search location...';

    const results = L.DomUtil.create('ul', 'search-results', form);

    const closeForm = () => form.classList.add('hidden');
    const openForm = () => {
      form.classList.remove('hidden');
      input.focus();
    };

    const search = async (query) => {
      if (!query) return;
      results.innerHTML = '<li>Searching...</li>';
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        );
        const data = await resp.json();
        results.innerHTML = '';
        if (!data.length) {
          results.innerHTML = '<li>No results</li>';
          return;
        }
        data.slice(0, 5).forEach((place) => {
          const li = L.DomUtil.create('li', 'search-result-item', results);
          li.textContent = place.display_name;
          li.addEventListener('click', () => {
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            map.flyTo([lat, lon], 16, { animate: true, duration: 2 });
            closeForm();
          });
        });
      } catch (e) {
        results.innerHTML = '<li>Error fetching results</li>';
      }
    };

    button.addEventListener('click', () => {
      if (form.classList.contains('hidden')) openForm();
      else closeForm();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        search(input.value);
      }
    });

    L.DomEvent.disableClickPropagation(container);
    return container;
  },
});

const SearchControlComponent = () => {
  const map = useMap();
  useEffect(() => {
    const control = new SearchControl({ position: 'topleft' });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);
  return null;
};

export default SearchControlComponent;