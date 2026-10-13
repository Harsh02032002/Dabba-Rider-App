import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface DeliveryMapProps {
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  distance?: string;
}

const DeliveryMap = ({ pickupCoords, dropCoords }: DeliveryMapProps) => {
  if (!pickupCoords || !dropCoords) return null;

  const pickupLat = pickupCoords[1];
  const pickupLng = pickupCoords[0];
  const dropLat = dropCoords[1];
  const dropLng = dropCoords[0];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .custom-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${(pickupLat + dropLat) / 2}, ${(pickupLng + dropLng) / 2}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM'
          }).addTo(map);

          const pickupIcon = L.divIcon({
            html: '<div class="custom-icon" style="background: #3B82F6; width: 30px; height: 30px; font-size: 15px;">🏪</div>',
            iconSize: [30, 30],
            className: ''
          });

          const dropIcon = L.divIcon({
            html: '<div class="custom-icon" style="background: #10B981; width: 30px; height: 30px; font-size: 15px;">🏠</div>',
            iconSize: [30, 30],
            className: ''
          });

          L.marker([${pickupLat}, ${pickupLng}], { icon: pickupIcon }).addTo(map);
          L.marker([${dropLat}, ${dropLng}], { icon: dropIcon }).addTo(map);

          const polyline = L.polyline([[${pickupLat}, ${pickupLng}], [${dropLat}, ${dropLng}]], {
            color: '#3B82F6',
            weight: 3,
            dashArray: '10, 10'
          }).addTo(map);

          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  map: {
    flex: 1,
  },
});

export default DeliveryMap;
