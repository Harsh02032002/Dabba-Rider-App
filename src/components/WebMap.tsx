import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

interface WebMapProps {
  location?: { lat: number; lng: number };
}

const WebMap = ({ location: propLocation }: WebMapProps) => {
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (error) {
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const finalLocation = propLocation || location;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0; padding:0;">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=${finalLocation.lng - 0.01},${finalLocation.lat - 0.01},${finalLocation.lng + 0.01},${finalLocation.lat + 0.01}&layer=mapnik&marker=${finalLocation.lat},${finalLocation.lng}"
          style="width: 100vw; height: 100vh; border: none;"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web Map View</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Getting location...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={styles.map}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', padding: 15, backgroundColor: '#3b82f6', color: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#64748b' },
  mapContainer: { flex: 1 },
  map: { flex: 1, margin: 10, borderRadius: 12 },
});

export default WebMap;
