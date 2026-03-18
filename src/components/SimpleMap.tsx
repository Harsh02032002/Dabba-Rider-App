import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

const SimpleMap = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Test Map - Should Show Now!</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  map: {
    flex: 1,
  },
});

export default SimpleMap;
