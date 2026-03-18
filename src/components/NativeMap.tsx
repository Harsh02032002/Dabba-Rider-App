import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

interface NativeMapProps {
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  distance?: string;
}

const NativeMap = ({ pickupCoords, dropCoords, distance }: NativeMapProps) => {
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        setCurrentLocation({ latitude, longitude });
        
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        setIsLoading(false);
      } catch (error) {
        console.log('Location error:', error);
        setErrorMsg('Unable to get location. Please enable GPS.');
        setIsLoading(false);
      }
    })();

    // Watch for location changes
    const subscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 10,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCurrentLocation({ latitude, longitude });
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    );

    return () => {
      subscription.then(sub => sub.remove());
    };
  }, []);

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      const centerLat = (pickupCoords[1] + dropCoords[1]) / 2;
      const centerLng = (pickupCoords[0] + dropCoords[0]) / 2;
      
      setRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.abs(pickupCoords[1] - dropCoords[1]) + 0.02,
        longitudeDelta: Math.abs(pickupCoords[0] - dropCoords[0]) + 0.02,
      });
    }
  }, [pickupCoords, dropCoords]);

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Live Delivery Map</Text>
        {distance && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distance} km</Text>
          </View>
        )}
      </View>

      {/* Map View - Always show */}
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={true}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current delivery position"
          >
            <View style={styles.currentMarker}>
              <Text style={styles.markerIcon}>🛵</Text>
            </View>
          </Marker>
        )}

        {/* Pickup Marker */}
        {pickupCoords && (
          <Marker
            coordinate={{
              latitude: pickupCoords[1],
              longitude: pickupCoords[0],
            }}
            title="Pickup Location"
            description="Restaurant pickup point"
          >
            <View style={[styles.marker, styles.pickupMarker]}>
              <Text style={styles.markerIcon}>🏪</Text>
            </View>
          </Marker>
        )}

        {/* Drop-off Marker */}
        {dropCoords && (
          <Marker
            coordinate={{
              latitude: dropCoords[1],
              longitude: dropCoords[0],
            }}
            title="Drop-off Location"
            description="Customer drop-off point"
          >
            <View style={[styles.marker, styles.dropMarker]}>
              <Text style={styles.markerIcon}>🏠</Text>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {pickupCoords && dropCoords && (
          <Polyline
            coordinates={[
              { latitude: pickupCoords[1], longitude: pickupCoords[0] },
              { latitude: dropCoords[1], longitude: dropCoords[0] },
            ]}
            strokeColor="#3B82F6"
            strokeWidth={3}
            lineDashPattern={[10, 10]}
          />
        )}
      </MapView>

      {/* Loading/Error Overlay */}
      {(isLoading || errorMsg) && (
        <View style={styles.overlayContainer}>
          {isLoading && (
            <Text style={styles.overlayText}>📍 Getting your location...</Text>
          )}
          {errorMsg && (
            <Text style={styles.overlayText}>⚠️ {errorMsg}</Text>
          )}
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlBtn}
          onPress={() => {
            if (pickupCoords && dropCoords) {
              Alert.alert('Route Info', `Distance: ${distance || 'N/A'} km\nPickup: Restaurant\nDrop-off: Customer`);
            }
          }}
        >
          <Text style={styles.controlText}>📍 Route Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  distanceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    backgroundColor: '#ef4444',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  currentMarker: {
    backgroundColor: '#10b981',
  },
  pickupMarker: {
    backgroundColor: '#f59e0b',
  },
  dropMarker: {
    backgroundColor: '#3b82f6',
  },
  markerIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  controlBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  marginHorizontal: 8,
  },
  controlText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default NativeMap;
