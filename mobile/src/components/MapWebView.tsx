import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Coordinates, Gym } from '../types/gym';

interface MapWebViewProps {
  center: Coordinates;
  userLocation: Coordinates | null;
  gyms: Gym[];
  onGymPress: (gymId: string) => void;
  onMapMove: (center: Coordinates) => void;
  onMapError: (message: string) => void;
}

function scriptValue(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function createMapHtml(
  center: Coordinates,
  userLocation: Coordinates | null,
  gyms: Gym[],
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link href="https://unpkg.com/maplibre-gl@4.0.2/dist/maplibre-gl.css" rel="stylesheet">
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; overflow: hidden; }
    .gym-pin {
      position: relative;
      width: 32px; height: 38px; display: flex; justify-content: center;
      align-items: flex-start; cursor: pointer; filter: drop-shadow(0 2px 3px #0005);
    }
    .gym-pin::before {
      content: ""; width: 28px; height: 28px; margin-top: 2px;
      background: #e44343; border: 3px solid #fff; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
    }
    .gym-pin::after {
      content: ""; width: 8px; height: 8px; position: absolute; top: 12px;
      background: white; border-radius: 50%;
    }
    .attribution {
      position: absolute; bottom: 4px; left: 4px; z-index: 2;
      padding: 3px 6px; border-radius: 3px; background: #fffE;
      color: #333; font-size: 10px;
    }
    .attribution a { color: #1769aa; text-decoration: none; }
    .map-error { display: none; position: absolute; inset: 0; background: #f2f4f7;
      color: #263238; align-items: center; justify-content: center; text-align: center;
      padding: 24px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="attribution">
    © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
    · <a href="https://openfreemap.org/">OpenFreeMap</a>
  </div>
  <div id="map-error" class="map-error"></div>
  <script src="https://unpkg.com/maplibre-gl@4.0.2/dist/maplibre-gl.js"></script>
  <script>
    (function () {
      const startCenter = ${scriptValue([center.longitude, center.latitude])};
      let centerCoordinates = startCenter;
      const initialUser = ${scriptValue(
        userLocation
          ? [userLocation.longitude, userLocation.latitude]
          : null,
      )};
      let gyms = ${scriptValue(gyms)};
      let map;
      let markers = [];
      let userCoordinates = initialUser;
      let mapLoaded = false;
      let ignoreProgrammaticMove = false;

      function send(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function renderGyms() {
        markers.forEach(function (marker) { marker.remove(); });
        markers = [];
        gyms.forEach(function (gym) {
          const element = document.createElement('div');
          element.className = 'gym-pin';
          const marker = new maplibregl.Marker({ element: element, anchor: 'bottom' })
            .setLngLat(gym.location.coordinates)
            .addTo(map);
          element.addEventListener('click', function (event) {
            event.stopPropagation();
            send({ type: 'gymClick', id: gym._id });
          });
          markers.push(marker);
        });
      }

      function setUserPoint(coordinates) {
        userCoordinates = coordinates;
        const feature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coordinates },
          properties: {}
        };
        if (map.getSource('user-location')) {
          map.getSource('user-location').setData(feature);
          return;
        }
        map.addSource('user-location', { type: 'geojson', data: feature });
        map.addLayer({
          id: 'user-location-halo',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 14,
            'circle-color': '#2d8cff',
            'circle-opacity': 0.2
          }
        });
        map.addLayer({
          id: 'user-location-dot',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 6,
            'circle-color': '#2d8cff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }

      window.updateMapData = function (payload) {
        if (payload.gyms) {
          gyms = payload.gyms;
          if (map && map.isStyleLoaded()) renderGyms();
        }
        if (payload.userLocation) {
          userCoordinates = [payload.userLocation.longitude, payload.userLocation.latitude];
          if (map && map.isStyleLoaded()) setUserPoint(userCoordinates);
        }
        if (payload.center && map && map.isStyleLoaded()) {
          centerCoordinates = [payload.center.longitude, payload.center.latitude];
        } else if (payload.center) {
          centerCoordinates = [payload.center.longitude, payload.center.latitude];
        }
        if (payload.center && map && map.isStyleLoaded()) {
          const current = map.getCenter();
          const longitudeDifference = Math.abs(current.lng - centerCoordinates[0]);
          const latitudeDifference = Math.abs(current.lat - centerCoordinates[1]);
          if (longitudeDifference > 0.000001 || latitudeDifference > 0.000001) {
            ignoreProgrammaticMove = true;
            map.setCenter(centerCoordinates);
          }
        }
      };

      if (!window.maplibregl) {
        send({ type: 'mapError', message: 'MapLibre failed to load from its CDN.' });
        return;
      }

      map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: startCenter,
        zoom: 14,
        attributionControl: true
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', function () {
        mapLoaded = true;
        if (userCoordinates) setUserPoint(userCoordinates);
        renderGyms();
        const current = map.getCenter();
        if (
          Math.abs(current.lng - centerCoordinates[0]) > 0.000001 ||
          Math.abs(current.lat - centerCoordinates[1]) > 0.000001
        ) {
          ignoreProgrammaticMove = true;
          map.setCenter(centerCoordinates);
        }
      });
      map.on('moveend', function () {
        if (!mapLoaded || ignoreProgrammaticMove) {
          ignoreProgrammaticMove = false;
          return;
        }
        const center = map.getCenter();
        send({
          type: 'mapMove',
          center: { latitude: center.lat, longitude: center.lng }
        });
      });
      map.on('error', function (event) {
        const message = event && event.error ? event.error.message : 'Map tiles could not be loaded.';
        send({ type: 'mapError', message: message });
      });
    })();
  </script>
</body>
</html>`;
}

export default function MapWebView({
  center,
  userLocation,
  gyms,
  onGymPress,
  onMapMove,
  onMapError,
}: MapWebViewProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [initialHtml] = useState(() => createMapHtml(center, userLocation, gyms));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const payload = scriptValue({ gyms });
    webViewRef.current?.injectJavaScript(
      `window.updateMapData(${payload}); true;`,
    );
  }, [gyms, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const payload = scriptValue({ userLocation, center });
    webViewRef.current?.injectJavaScript(
      `window.updateMapData(${payload}); true;`,
    );
  }, [center, loaded, userLocation]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message: {
        type?: string;
        id?: string;
        center?: Coordinates;
        message?: string;
      } = JSON.parse(event.nativeEvent.data);

      if (message.type === 'gymClick' && message.id) {
        onGymPress(message.id);
      } else if (message.type === 'mapMove' && message.center) {
        onMapMove(message.center);
      } else if (message.type === 'mapError' && message.message) {
        onMapError(message.message);
      }
    } catch (error) {
      onMapError(
        error instanceof Error
          ? `Could not read map response: ${error.message}`
          : 'Could not read map response.',
      );
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setLoaded(true)}
        onMessage={handleMessage}
        onError={(event) => onMapError(event.nativeEvent.description)}
        onHttpError={(event) =>
          onMapError(`Map request failed with HTTP ${event.nativeEvent.statusCode}.`)
        }
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    overflow: 'hidden',
    backgroundColor: '#e8edf0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
