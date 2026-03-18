import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
        // Get real GPS location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          setIsLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        
        setLocation({ lat: latitude, lng: longitude });
        setIsLoading(false);
      } catch (error) {
        console.log('Location error:', error);
        setIsLoading(false);
      }
    })();
  }, []);

  // Use prop location if provided, otherwise use GPS location
  const finalLocation = propLocation || location;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Web Map View</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>📍 Getting location...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <div style={styles.map}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${finalLocation.lng - 0.01},${finalLocation.lat - 0.01},${finalLocation.lng + 0.01},${finalLocation.lat + 0.01}&layer=mapnik&marker=${finalLocation.lat},${finalLocation.lng}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
            />
          </div>
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              📍 Lat: {finalLocation.lat.toFixed(4)}, Lng: {finalLocation.lng.toFixed(4)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  locationInfo: {
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationText: {
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'center',
  },
});

export default WebMap;
