import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';

interface DeliveryMapProps {
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  distance?: string;
}

const DeliveryMap = ({ pickupCoords, dropCoords, distance }: DeliveryMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Add custom CSS for map icons
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        .custom-pickup-icon, .custom-drop-icon, .custom-vehicle-icon {
          background: white !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          z-index: 1000 !important;
        }
        .custom-pickup-icon {
          width: 40px !important;
          height: 40px !important;
          font-size: 20px !important;
          font-weight: bold !important;
        }
        .custom-drop-icon {
          width: 40px !important;
          height: 40px !important;
          font-size: 20px !important;
          font-weight: bold !important;
        }
        .custom-vehicle-icon {
          width: 35px !important;
          height: 35px !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !pickupCoords || !dropCoords) return;

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      try {
        // Load Leaflet CSS
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);

        // Load Leaflet JS
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
          setTimeout(() => initializeMap(), 100); // Small delay to ensure DOM is ready
        };
        document.head.appendChild(leafletJS);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.L || mapInstanceRef.current) return;

      // Clear existing map and instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      mapRef.current.innerHTML = '';

      // Validate coordinates
      const pickupLat = pickupCoords?.[1];
      const pickupLng = pickupCoords?.[0];
      const dropLat = dropCoords?.[1];
      const dropLng = dropCoords?.[0];

      if (!pickupLat || !pickupLng || !dropLat || !dropLng ||
          isNaN(pickupLat) || isNaN(pickupLng) || 
          isNaN(dropLat) || isNaN(dropLng)) {
        console.error('Invalid coordinates:', { pickupCoords, dropCoords });
        return;
      }

      console.log('🗺️ Initializing map with coordinates:', {
        pickup: pickupCoords,
        drop: dropCoords,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropLat: dropLat,
        dropLng: dropLng
      });

      // Initialize map
      const L = window.L;
      const map = L.map(mapRef.current).setView([
        (pickupLat + dropLat) / 2,
        (pickupLng + dropLng) / 2
      ], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create custom icons with better styling
      const pickupIcon = L.divIcon({
        html: '<div style="background: #3B82F6; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏪</div>',
        iconSize: [40, 40],
        className: 'custom-pickup-icon'
      });

      const dropIcon = L.divIcon({
        html: '<div style="background: #10B981; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏠</div>',
        iconSize: [40, 40],
        className: 'custom-drop-icon'
      });

      const vehicleIcon = L.divIcon({
        html: '<div style="background: #F97316; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🛵</div>',
        iconSize: [35, 35],
        className: 'custom-vehicle-icon'
      });

      // Add markers with error handling
      console.log('🏪 Adding pickup marker at:', [pickupLat, pickupLng]);
      const pickupMarker = L.marker([pickupLat, pickupLng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup('📍 Pickup Location<br><b>Restaurant</b>');

      console.log('🏠 Adding drop marker at:', [dropLat, dropLng]);
      const dropMarker = L.marker([dropLat, dropLng], { icon: dropIcon })
        .addTo(map)
        .bindPopup('📍 Drop Location<br><b>Customer</b>');

      console.log('🛵 Adding vehicle marker at:', [pickupLat, pickupLng]);
      // Add vehicle marker (current position)
      const vehicleMarker = L.marker([pickupLat, pickupLng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup('🛵 Your Current Position');

      // Draw route line
      const routeCoordinates: [number, number][] = [
        [pickupLat, pickupLng],
        [dropLat, dropLng]
      ];

      L.polyline(routeCoordinates, {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(map);

      // Fit map to show both markers
      const group = new L.FeatureGroup([pickupMarker, dropMarker]);
      map.fitBounds(group.getBounds().pad(0.1));

      // Store map instance
      mapInstanceRef.current = map;
      
      console.log('✅ Map initialized successfully with markers!');
    };

    loadLeaflet();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupCoords, dropCoords]);

  if (!pickupCoords || !dropCoords) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>📍 No route data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div ref={mapRef} style={styles.map} />
      {distance && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>🚚 {distance} km</Text>
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    height: 250,
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  distanceBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  text: {
    textAlign: 'center' as const,
    color: '#64748b',
    fontWeight: '500' as const,
    marginTop: 80,
  },
};

declare global {
  interface Window {
    L: any;
  }
}

export default DeliveryMap;
