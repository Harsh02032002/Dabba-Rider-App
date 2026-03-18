import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface InteractiveMapProps {
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  distance?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

const InteractiveMap = ({ 
  pickupCoords, 
  dropCoords, 
  distance,
  onLocationUpdate 
}: InteractiveMapProps) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (onLocationUpdate) {
      const interval = setInterval(() => {
        // Simulate location updates
        const lat = 28.6139 + (Math.random() - 0.5) * 0.01;
        const lng = 77.2090 + (Math.random() - 0.5) * 0.01;
        setCurrentLocation([lat, lng]);
        onLocationUpdate(lat, lng);
      }, 3000);
      
      setIsTracking(true);
      return () => clearInterval(interval);
    }
  }, [onLocationUpdate]);

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

      {/* Map Area */}
      <View style={styles.mapArea}>
        {/* Current Location */}
        {currentLocation && (
          <View style={[styles.marker, styles.currentLocation]}>
            <Text style={styles.markerIcon}>🛵</Text>
            <Text style={styles.markerLabel}>You</Text>
          </View>
        )}

        {/* Pickup Location */}
        {pickupCoords && (
          <View style={[styles.marker, styles.pickupLocation]}>
            <Text style={styles.markerIcon}>🏪</Text>
            <Text style={styles.markerLabel}>Pickup</Text>
          </View>
        )}

        {/* Drop Location */}
        {dropCoords && (
          <View style={[styles.marker, styles.dropLocation]}>
            <Text style={styles.markerIcon}>🏠</Text>
            <Text style={styles.markerLabel}>Drop-off</Text>
          </View>
        )}

        {/* Route Lines */}
        {pickupCoords && dropCoords && (
          <View style={styles.routeLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeDot} />
            <View style={styles.routeDot} />
          </View>
        )}

        {/* Tracking Status */}
        <View style={styles.trackingStatus}>
          <Text style={styles.trackingText}>
            {isTracking ? '📍 Tracking Active' : '📍 Location Paused'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlBtn, isTracking && styles.activeBtn]}
          onPress={() => setIsTracking(!isTracking)}
        >
          <Text style={styles.controlText}>
            {isTracking ? '⏸ Pause' : '▶ Start'} Tracking
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3b82f6',
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
  mapArea: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    padding: 20,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  currentLocation: {
    top: 100,
    left: 50,
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: '#10b981',
  },
  pickupLocation: {
    top: 80,
    left: 30,
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: '#f59e0b',
  },
  dropLocation: {
    top: 120,
    right: 30,
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: '#3b82f6',
  },
  markerIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  markerLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  routeLine: {
    position: 'absolute',
    top: 80,
    left: 80,
    right: 80,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  trackingStatus: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  controls: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  controlBtn: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  activeBtn: {
    backgroundColor: '#3b82f6',
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default InteractiveMap;
