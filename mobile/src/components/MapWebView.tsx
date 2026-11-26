import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import type { Coordinates, Gym } from '../types/gym';

type WebViewHandle = { injectJavaScript: (script: string) => void };

// react-native-webview 14's WebViewProps collapse to `never` under React 19.3's
// types, so declare the props this component actually uses.
const WebView = RNWebView as unknown as ComponentType<{
  ref?: Ref<WebViewHandle>;
  source: { html: string };
  originWhitelist: string[];
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  onLoadEnd?: () => void;
  onMessage?: (event: WebViewMessageEvent) => void;
  onError?: (event: WebViewErrorEvent) => void;
  onHttpError?: (event: WebViewHttpErrorEvent) => void;
  style?: StyleProp<ViewStyle>;
}>;

interface MapWebViewProps {
  center: Coordinates;
  userLocation: Coordinates | null;
  gyms: Gym[];
  /** Highlights this gym's pin and pans the map to it. */
  selectedGymId?: string | null;
  /** Space (px) covered by overlays at the bottom, so focused pins stay visible. */
  bottomInset?: number;
  onGymPress: (gymId: string) => void;
  onMapMove: (center: Coordinates) => void;
  onMapError: (message: string) => void;
  style?: StyleProp<ViewStyle>;
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
    /* .gym-marker is positioned by MapLibre (position + transform): never
       style either of those here. All visuals live on the inner .gym-pin. */
    .gym-marker { width: 32px; height: 38px; cursor: pointer; }
    .gym-marker.selected { z-index: 5; }
    .gym-pin {
      position: relative;
      width: 32px; height: 38px; display: flex; justify-content: center;
      align-items: flex-start; filter: drop-shadow(0 2px 3px #0005);
      transition: transform 120ms ease-out;
      transform-origin: bottom center;
    }
    .gym-marker.selected .gym-pin { transform: scale(1.3); }
    .gym-pin::before {
      content: ""; width: 28px; height: 28px; margin-top: 2px;
      background: #E11D2E; border: 3px solid #fff; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
    }
    .gym-pin::after {
      content: ""; width: 8px; height: 8px; position: absolute; top: 12px;
      background: white; border-radius: 50%;
    }
    .gym-marker.selected .gym-pin::before { background: #111111; border-color: #E11D2E; }
    .maplibregl-ctrl-attrib.maplibregl-compact { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
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
      let markers = {};
      let selectedId = null;
      let bottomInset = 0;
      let userCoordinates = initialUser;
      let mapLoaded = false;

      function send(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function applySelection() {
        Object.keys(markers).forEach(function (id) {
          markers[id].getElement().classList.toggle('selected', id === selectedId);
        });
      }

      function renderGyms() {
        Object.keys(markers).forEach(function (id) { markers[id].remove(); });
        markers = {};
        gyms.forEach(function (gym) {
          const element = document.createElement('div');
          element.className = 'gym-marker';
          const pin = document.createElement('div');
          pin.className = 'gym-pin';
          element.appendChild(pin);
          const marker = new maplibregl.Marker({ element: element, anchor: 'bottom' })
            .setLngLat(gym.location.coordinates)
            .addTo(map);
          element.addEventListener('click', function (event) {
            event.stopPropagation();
            send({ type: 'gymClick', id: gym._id });
          });
          markers[gym._id] = marker;
        });
        applySelection();
      }

      function focusSelected() {
        const gym = gyms.find(function (item) { return item._id === selectedId; });
        if (!gym || !map) return;
        map.easeTo({ center: gym.location.coordinates, duration: 450 });
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
        const ready = map && map.isStyleLoaded();
        if (typeof payload.bottomInset === 'number') {
          bottomInset = payload.bottomInset;
          if (map) map.setPadding({ top: 0, left: 0, right: 0, bottom: bottomInset });
        }
        if (payload.gyms) {
          gyms = payload.gyms;
          if (ready) renderGyms();
        }
        if (payload.userLocation) {
          userCoordinates = [payload.userLocation.longitude, payload.userLocation.latitude];
          if (ready) setUserPoint(userCoordinates);
        }
        if (payload.center) {
          centerCoordinates = [payload.center.longitude, payload.center.latitude];
          if (ready) {
            map.easeTo({ center: centerCoordinates, duration: 450 });
          }
        }
        if (payload.selectedId !== undefined) {
          selectedId = payload.selectedId;
          applySelection();
          if (ready && selectedId) focusSelected();
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
        attributionControl: false
      });
      // Top corners stay clear of the gym cards that overlay the bottom of the map.
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-left');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', function () {
        mapLoaded = true;
        map.setPadding({ top: 0, left: 0, right: 0, bottom: bottomInset });
        if (userCoordinates) setUserPoint(userCoordinates);
        renderGyms();
        map.jumpTo({ center: centerCoordinates });
      });
      // Only user gestures (drag, pinch, zoom buttons) carry originalEvent;
      // programmatic easeTo/jumpTo moves do not.
      map.on('moveend', function (event) {
        if (!mapLoaded || !event.originalEvent) return;
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
  selectedGymId = null,
  bottomInset = 0,
  onGymPress,
  onMapMove,
  onMapError,
  style,
}: MapWebViewProps) {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [initialHtml] = useState(() => createMapHtml(center, userLocation, gyms));
  const [loaded, setLoaded] = useState(false);

  function send(payload: Record<string, unknown>) {
    webViewRef.current?.injectJavaScript(
      `if (window.updateMapData) window.updateMapData(${scriptValue(payload)}); true;`,
    );
  }

  useEffect(() => {
    if (loaded) send({ bottomInset });
  }, [bottomInset, loaded]);

  useEffect(() => {
    if (loaded) send({ gyms });
  }, [gyms, loaded]);

  useEffect(() => {
    if (loaded) send({ userLocation });
  }, [loaded, userLocation]);

  // `center` is compared by reference: pass a new object to re-center on the same spot.
  useEffect(() => {
    if (loaded) send({ center });
  }, [center, loaded]);

  useEffect(() => {
    if (loaded) send({ selectedId: selectedGymId });
  }, [loaded, selectedGymId]);

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
    <View style={[styles.container, style]}>
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
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e8edf0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
