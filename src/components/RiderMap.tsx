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
  riderHeading?: number | null;
  deliveryStage?: 'to_restaurant' | 'to_customer' | 'delivered';
  style?: any;
  height?: number;
}

/**
 * RiderMap Component
 * - 100% Free OpenStreetMap + Leaflet.js + OSRM road routing
 * - Blinkit-style smooth scooter gliding animation, road polyline, live ETA & distance pill
 * - Cross-platform: Native WebView on iOS/Android, responsive iframe on Web
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
  riderHeading = null,
  deliveryStage = 'to_restaurant',
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

  // Push rider location & stage updates into the map
  useEffect(() => {
    if (riderLat && riderLng && status === 'ready') {
      const payload = JSON.stringify({
        type: 'riderUpdate',
        lat: riderLat,
        lng: riderLng,
        heading: riderHeading,
        stage: deliveryStage,
      });
      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(payload, '*');
      } else if (webRef.current) {
        webRef.current.postMessage(payload);
      }
    }
  }, [riderLat, riderLng, riderHeading, deliveryStage, status]);

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
  const safePickupLabel = String(pickupLabel).replace(/'/g, "\\'");
  const safeDropLabel = String(dropLabel).replace(/'/g, "\\'");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body,#map{width:100%;height:100%;background:#E8EFF5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
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
#loader p{color:#6B7280;font-size:12px;font-weight:600;}
.pulse-ring{
  position:absolute;width:48px;height:48px;border-radius:50%;
  background:rgba(255,107,0,0.32);top:-4px;left:-4px;
  animation:pul 1.5s ease-out infinite;pointer-events:none;
}
@keyframes pul{0%{transform:scale(0.75);opacity:1;}100%{transform:scale(1.9);opacity:0;}}
.rider-wrap{
  position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;
}
.rider-bubble{
  position:relative;background:#FF6B00;color:#fff;
  border-radius:50%;width:38px;height:38px;
  display:flex;align-items:center;justify-content:center;
  border:2.5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.35);
  font-size:19px;z-index:2;
}
.heading-cone{
  position:absolute;top:-8px;left:11px;width:0;height:0;
  border-left:9px solid transparent;border-right:9px solid transparent;
  border-bottom:12px solid #FF6B00;z-index:1;
  filter:drop-shadow(0 -1px 2px rgba(0,0,0,0.2));
}
#eta-pill{
  position:fixed;bottom:14px;left:14px;z-index:1000;
  background:rgba(17,24,39,0.92);color:#fff;
  padding:8px 13px;border-radius:14px;
  display:flex;align-items:center;gap:8px;
  box-shadow:0 4px 12px rgba(0,0,0,0.25);
  backdrop-filter:blur(6px);
  font-size:12px;font-weight:700;
}
#eta-pill .eta-badge{
  background:#22C55E;color:#fff;padding:3px 7px;border-radius:8px;
  font-weight:800;font-size:11px;
}
#recenter-btn{
  position:fixed;bottom:82px;right:10px;z-index:1000;
  width:36px;height:36px;border-radius:10px;
  background:#fff;border:1px solid #E5E7EB;
  box-shadow:0 2px 8px rgba(0,0,0,0.18);
  display:flex;align-items:center;justify-content:center;
  font-size:17px;cursor:pointer;
}
</style>
</head>
<body>
<div id="loader"><div class="spin"></div><p>Loading Live Map...</p></div>
<div id="map"></div>
<div id="eta-pill" style="display:none;">
  <span class="eta-badge" id="eta-time">-- min</span>
  <span id="eta-dist">Calculating route...</span>
</div>
<div id="recenter-btn" title="Follow Rider" onclick="recenterMap()">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
</div>

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

var map = null;
var riderMarker = null;
var fullRouteLine = null;
var activeRouteLine = null;
var currentStage = '${deliveryStage}';
var followRider = true;
var animFrame = null;
var prevRiderPos = null;
var lastRoutedPos = null;
var lastRoutedStage = null;

var pickupPos = { lat: ${safePickupLat}, lng: ${safePickupLng} };
var dropPos = { lat: ${safeDropLat}, lng: ${safeDropLng} };

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1, lng1, lat2, lng2) {
  var dLon = (lng2 - lng1) * Math.PI / 180;
  var y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  var x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
          Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  var brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function updateEtaPill(distKm, durationSec, stageLabel) {
  var pill = document.getElementById('eta-pill');
  var timeEl = document.getElementById('eta-time');
  var distEl = document.getElementById('eta-dist');
  if (!pill || !timeEl || !distEl) return;
  pill.style.display = 'flex';
  var mins = durationSec ? Math.max(1, Math.round(durationSec / 60)) : Math.max(1, Math.round((distKm / 25) * 60));
  timeEl.textContent = mins + ' min';
  var distStr = distKm < 1 ? Math.round(distKm * 1000) + ' m' : distKm.toFixed(1) + ' km';
  distEl.textContent = distStr + ' • ' + stageLabel;
}

function fetchOsrmRoute(fromLat, fromLng, toLat, toLng, callback) {
  var url = 'https://router.project-osrm.org/route/v1/driving/' +
    fromLng + ',' + fromLat + ';' + toLng + ',' + toLat +
    '?overview=full&geometries=geojson';
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
        var coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
        callback(coords, data.routes[0].distance / 1000, data.routes[0].duration);
      } else {
        callback([[fromLat, fromLng], [toLat, toLng]], haversineKm(fromLat, fromLng, toLat, toLng), null);
      }
    })
    .catch(function() {
      callback([[fromLat, fromLng], [toLat, toLng]], haversineKm(fromLat, fromLng, toLat, toLng), null);
    });
}

function recenterMap() {
  followRider = true;
  if (!map) return;
  var pts = [[pickupPos.lat, pickupPos.lng], [dropPos.lat, dropPos.lng]];
  if (prevRiderPos) pts.push([prevRiderPos.lat, prevRiderPos.lng]);
  try { map.fitBounds(pts, { padding: [45, 45], maxZoom: 17 }); } catch(e) {}
}

var storeSvg = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
var homeSvg = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
var scooterSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>';

function init() {
  if (typeof L === 'undefined') {
    setTimeout(init, 100);
    return;
  }
  var loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  map = L.map('map', {
    center: [${centerLat}, ${centerLng}],
    zoom: 14,
    zoomControl: false,
    attributionControl: true
  });

  map.on('dragstart', function() { followRider = false; });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'abc',
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Pickup marker (Store)
  var pickupIcon = L.divIcon({
    html: '<div style="background:#FF6B00;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);">' + storeSvg + '</div>',
    iconSize: [34, 34], iconAnchor: [17, 34], className: ''
  });
  L.marker([pickupPos.lat, pickupPos.lng], { icon: pickupIcon })
    .addTo(map)
    .bindPopup('<b>${safePickupLabel}</b><br><small>Pickup Kitchen</small>');

  // Drop marker (Home)
  var dropIcon = L.divIcon({
    html: '<div style="background:#22C55E;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,0.3);">' + homeSvg + '</div>',
    iconSize: [34, 34], iconAnchor: [17, 34], className: ''
  });
  L.marker([dropPos.lat, dropPos.lng], { icon: dropIcon })
    .addTo(map)
    .bindPopup('<b>${safeDropLabel}</b><br><small>Customer Drop</small>');

  // Base Store -> Customer road route
  fullRouteLine = L.polyline([[pickupPos.lat, pickupPos.lng], [dropPos.lat, dropPos.lng]], {
    color: '#94A3B8', weight: 4, opacity: 0.65, dashArray: '6,8'
  }).addTo(map);

  fetchOsrmRoute(pickupPos.lat, pickupPos.lng, dropPos.lat, dropPos.lng, function(coords, distKm, durSec) {
    if (fullRouteLine) fullRouteLine.setLatLngs(coords);
    if (!prevRiderPos) {
      updateEtaPill(distKm, durSec, 'Store → Customer');
    }
  });

  function buildRiderIcon(headingDeg) {
    var rot = headingDeg != null && !isNaN(headingDeg) ? headingDeg : 0;
    var coneHtml = headingDeg != null && !isNaN(headingDeg)
      ? '<div style="position:absolute;width:40px;height:40px;top:0;left:0;transform:rotate(' + rot + 'deg);"><div class="heading-cone"></div></div>'
      : '';
    return L.divIcon({
      html: '<div class="rider-wrap"><div class="pulse-ring"></div>' + coneHtml + '<div class="rider-bubble">' + scooterSvg + '</div></div>',
      iconSize: [40, 40], iconAnchor: [20, 20], className: ''
    });
  }

  function updateActiveRoute(rLat, rLng, stage) {
    var target = stage === 'to_customer' ? dropPos : pickupPos;
    var label = stage === 'to_customer' ? 'to Customer Drop' : 'to Pickup Store';
    var lineColor = stage === 'to_customer' ? '#16A34A' : '#FF6B00';

    var movedKm = lastRoutedPos ? haversineKm(lastRoutedPos.lat, lastRoutedPos.lng, rLat, rLng) : 999;
    if (movedKm < 0.03 && lastRoutedStage === stage) return;

    lastRoutedPos = { lat: rLat, lng: rLng };
    lastRoutedStage = stage;

    fetchOsrmRoute(rLat, rLng, target.lat, target.lng, function(coords, distKm, durSec) {
      if (activeRouteLine) {
        activeRouteLine.setLatLngs(coords);
        activeRouteLine.setStyle({ color: lineColor });
      } else {
        activeRouteLine = L.polyline(coords, {
          color: lineColor, weight: 5, opacity: 0.92, lineCap: 'round', lineJoin: 'round'
        }).addTo(map);
      }
      updateEtaPill(distKm, durSec, label);
    });
  }

  function updateRider(lat, lng, heading, stage) {
    if (!lat || !lng) return;
    if (stage) currentStage = stage;

    var computedHeading = heading;
    if ((computedHeading == null || isNaN(computedHeading) || computedHeading < 0) && prevRiderPos) {
      var moved = haversineKm(prevRiderPos.lat, prevRiderPos.lng, lat, lng);
      if (moved > 0.004) {
        computedHeading = calcBearing(prevRiderPos.lat, prevRiderPos.lng, lat, lng);
      }
    }

    var icon = buildRiderIcon(computedHeading);

    if (!riderMarker) {
      riderMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>Your Scooter</b><br><small>Live GPS Active</small>');
      prevRiderPos = { lat: lat, lng: lng };
      updateActiveRoute(lat, lng, currentStage);
      return;
    }

    riderMarker.setIcon(icon);

    // Smooth Blinkit-style gliding interpolation over 2.2 seconds
    var startLat = prevRiderPos ? prevRiderPos.lat : lat;
    var startLng = prevRiderPos ? prevRiderPos.lng : lng;
    prevRiderPos = { lat: lat, lng: lng };

    if (animFrame) cancelAnimationFrame(animFrame);
    var startTime = performance.now();
    var duration = 2200;

    function animateStep(now) {
      var t = Math.min(1, (now - startTime) / duration);
      // Ease out quad
      var ease = t * (2 - t);
      var curLat = startLat + (lat - startLat) * ease;
      var curLng = startLng + (lng - startLng) * ease;
      riderMarker.setLatLng([curLat, curLng]);
      if (t < 1) {
        animFrame = requestAnimationFrame(animateStep);
      }
    }
    animFrame = requestAnimationFrame(animateStep);

    updateActiveRoute(lat, lng, currentStage);

    if (followRider && map) {
      var target = currentStage === 'to_customer' ? dropPos : pickupPos;
      try {
        map.fitBounds([[lat, lng], [target.lat, target.lng]], { padding: [50, 50], maxZoom: 17, animate: true });
      } catch(e) {}
    }
  }

  ${riderLat && riderLng ? `updateRider(${riderLat}, ${riderLng}, ${riderHeading ?? 'null'}, '${deliveryStage}');` : ''}

  var pts = [[pickupPos.lat, pickupPos.lng], [dropPos.lat, dropPos.lng]];
  ${riderLat && riderLng ? `pts.push([${riderLat}, ${riderLng}]);` : ''}
  try { map.fitBounds(pts, { padding: [45, 45], maxZoom: 16 }); } catch(e) {}

  // Message receiver
  function onMsg(raw) {
    try {
      var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (d && d.type === 'riderUpdate' && d.lat && d.lng) {
        updateRider(d.lat, d.lng, d.heading, d.stage);
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
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorDesc}>Check your internet connection</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Retry</Text>
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
          source={{ html, baseUrl: 'https://dabbanation.in/' }}
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
