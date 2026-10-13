import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import {
  View, StyleSheet, Dimensions, ActivityIndicator,
  Text, TouchableOpacity, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

export interface RiderMapProps {
  pickupLat: number;
  pickupLng: number;
  pickupLabel?: string;
  dropLat: number;
  dropLng: number;
  dropLabel?: string;
  riderLat?: number;
  riderLng?: number;
  style?: any;
  height?: number;
}

/**
 * RiderMap Component
 * - 100% Free OpenStreetMap + Leaflet.js
 * - Cross-platform: Native WebView on iOS/Android, responsive iframe on Web
 * - Wrapped in forwardRef to eliminate React ref warnings
 * - Resilient ready status detection with multi-attempt handshake
 */
const RiderMap = forwardRef<any, RiderMapProps>(({
  pickupLat,
  pickupLng,
  pickupLabel = 'Pickup',
  dropLat,
  dropLng,
  dropLabel = 'Drop',
  riderLat,
  riderLng,
  style,
  height: mapHeight,
}, ref) => {
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const resolvedHeight = mapHeight ?? Math.round(height * 0.42);

  const reload = () => {
    setStatus('loading');
    if (Platform.OS === 'web') {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }
      setTimeout(() => setStatus('ready'), 800);
    } else {
      webRef.current?.reload();
      setTimeout(() => setStatus('ready'), 1500);
    }
  };

  useImperativeHandle(ref, () => ({
    reload,
    postMessage: (msg: string) => {
      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(msg, '*');
      } else {
        webRef.current?.postMessage(msg);
      }
    },
  }));

  // Push rider location updates into the map
  useEffect(() => {
    if (riderLat && riderLng && status === 'ready') {
      const payload = JSON.stringify({ type: 'riderUpdate', lat: riderLat, lng: riderLng });
      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(payload, '*');
      } else if (webRef.current) {
        webRef.current.postMessage(payload);
      }
    }
  }, [riderLat, riderLng, status]);

  // Web message listener & safety timer
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMsg = (e: MessageEvent) => {
        if (e.data === 'READY') setStatus('ready');
      };
      window.addEventListener('message', handleWebMsg);
      const timer = setTimeout(() => setStatus('ready'), 1000);
      return () => {
        window.removeEventListener('message', handleWebMsg);
        clearTimeout(timer);
      };
    } else {
      const timer = setTimeout(() => {
        setStatus((curr) => (curr === 'loading' ? 'ready' : curr));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const safePickupLat = Number(pickupLat) || 28.6139;
  const safePickupLng = Number(pickupLng) || 77.2090;
  const safeDropLat = Number(dropLat) || 28.6229;
  const safeDropLng = Number(dropLng) || 77.2190;
  const centerLat = +((safePickupLat + safeDropLat) / 2).toFixed(6);
  const centerLng = +((safePickupLng + safeDropLng) / 2).toFixed(6);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body,#map{width:100%;height:100%;background:#E8EFF5;}
.spin{
  width:32px;height:32px;border-radius:50%;
  border:3px solid #FF6B00;border-top-color:transparent;
  animation:sp 0.8s linear infinite;margin-bottom:8px;
}
@keyframes sp{to{transform:rotate(360deg)}}
#loader{
  position:fixed;top:0;left:0;right:0;bottom:0;
  background:#E8EFF5;display:flex;flex-direction:column;
  align-items:center;justify-content:center;z-index:9999;
}
#loader p{color:#6B7280;font-size:12px;font-weight:600;font-family:sans-serif;}
.pulse-ring{
  position:absolute;width:44px;height:44px;border-radius:50%;
  background:rgba(255,107,0,0.3);top:-4px;left:-4px;
  animation:pul 1.6s ease-out infinite;pointer-events:none;
}
@keyframes pul{0%{transform:scale(0.8);opacity:1;}100%{transform:scale(1.8);opacity:0;}}
.rider-bubble{
  position:relative;background:#FF6B00;color:#fff;
  border-radius:50%;width:36px;height:36px;
  display:flex;align-items:center;justify-content:center;
  border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);
  font-size:18px;
}
</style>
</head>
<body>
<div id="loader"><div class="spin"></div><p>Loading Map...</p></div>
<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
function sendReady() {
  try {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage('READY');
    }
  } catch(e) {}
  try {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage('READY', '*');
    }
  } catch(e) {}
}

function init() {
  if (typeof L === 'undefined') {
    setTimeout(init, 100);
    return;
  }
  var loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  var map = L.map('map', {
    center: [${centerLat}, ${centerLng}],
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'abc'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Pickup marker (Store)
  var pickupIcon = L.divIcon({
    html: '<div style="background:#FF6B00;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">🏪</div>',
    iconSize: [34, 34], iconAnchor: [17, 34], className: ''
  });
  L.marker([${safePickupLat}, ${safePickupLng}], { icon: pickupIcon })
    .addTo(map)
    .bindPopup('<b>📦 ${pickupLabel}</b><br><small>Pickup</small>');

  // Drop marker (Home)
  var dropIcon = L.divIcon({
    html: '<div style="background:#22C55E;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">🏠</div>',
    iconSize: [34, 34], iconAnchor: [17, 34], className: ''
  });
  L.marker([${safeDropLat}, ${safeDropLng}], { icon: dropIcon })
    .addTo(map)
    .bindPopup('<b>📍 ${dropLabel}</b><br><small>Delivery</small>');

  // Route dashed polyline
  L.polyline([[${safePickupLat}, ${safePickupLng}], [${safeDropLat}, ${safeDropLng}]], {
    color: '#3B82F6', weight: 4, opacity: 0.8, dashArray: '8,6'
  }).addTo(map);

  // Live Rider marker
  var riderMarker = null;
  function updateRider(lat, lng) {
    if (!lat || !lng) return;
    var riderIcon = L.divIcon({
      html: '<div style="position:relative"><div class="pulse-ring"></div><div class="rider-bubble">🛵</div></div>',
      iconSize: [36, 36], iconAnchor: [18, 18], className: ''
    });
    if (riderMarker) {
      riderMarker.setLatLng([lat, lng]);
    } else {
      riderMarker = L.marker([lat, lng], { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    }
  }

  ${riderLat && riderLng ? `updateRider(${riderLat}, ${riderLng});` : ''}

  var pts = [[${safePickupLat}, ${safePickupLng}], [${safeDropLat}, ${safeDropLng}]];
  ${riderLat && riderLng ? `pts.push([${riderLat}, ${riderLng}]);` : ''}
  try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 }); } catch(e) {}

  // Message receiver
  function onMsg(raw) {
    try {
      var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (d && d.type === 'riderUpdate' && d.lat && d.lng) {
        updateRider(d.lat, d.lng);
      }
    } catch(e) {}
  }
  document.addEventListener('message', function(e) { onMsg(e.data); });
  window.addEventListener('message', function(e) { onMsg(e.data); });

  sendReady();
  var count = 0;
  var timer = setInterval(function() {
    count++;
    sendReady();
    if (count > 5) clearInterval(timer);
  }, 250);
}

if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}
</script>
</body>
</html>`;

  return (
    <View style={[{ width: '100%', height: resolvedHeight, backgroundColor: '#E8EFF5' }, style]}>
      {status === 'loading' && (
        <View style={[StyleSheet.absoluteFillObject, styles.loaderOverlay]} pointerEvents="none">
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loaderText}>Loading live map...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={[StyleSheet.absoluteFillObject, styles.errorOverlay]}>
          <Text style={styles.errorIcon}>🗺️</Text>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorDesc}>Check your internet connection</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>↻ Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'web' ? (
        // Web responsive iframe
        // @ts-ignore
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', opacity: status === 'ready' ? 1 : 0.01 }}
          onLoad={() => setStatus('ready')}
        />
      ) : (
        <WebView
          ref={webRef}
          source={{ html }}
          style={{ flex: 1, opacity: status === 'ready' ? 1 : 0.01 }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowUniversalAccessFromFileURLs
          allowFileAccessFromFileURLs
          allowFileAccess
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState={false}
          onMessage={(e) => {
            if (e.nativeEvent.data === 'READY') setStatus('ready');
          }}
          onError={() => setStatus('error')}
          onHttpError={() => setStatus('error')}
          onLoadEnd={() => {
            setTimeout(() => setStatus('ready'), 800);
          }}
        />
      )}
    </View>
  );
});

RiderMap.displayName = 'RiderMap';

const styles = StyleSheet.create({
  loaderOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EFF5',
    zIndex: 10,
  },
  loaderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    zIndex: 10,
    padding: 20,
  },
  errorIcon: { fontSize: 40, marginBottom: 10 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  errorDesc: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default RiderMap;
