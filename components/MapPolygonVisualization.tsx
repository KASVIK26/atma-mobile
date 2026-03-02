import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

interface MapPolygonVisualizationProps {
  polygon: [number, number][]; // [longitude, latitude]
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  isInside?: boolean; // If true, polygon will be green, else red
  title?: string;
  height?: number;
}

const createMapHTML = (
  polygon: [number, number][],
  currentLocation?: MapPolygonVisualizationProps['currentLocation'],
  title: string = 'Classroom Location',
  isInside: boolean = false
) => {
  // Calculate polygon center for map focus
  const centerLon = polygon.reduce((sum, coord) => sum + coord[0], 0) / polygon.length;
  const centerLat = polygon.reduce((sum, coord) => sum + coord[1], 0) / polygon.length;

  // Convert [lon, lat] to [lat, lon] for Leaflet
  const leafletPolygon = polygon.map(([lon, lat]) => [lat, lon]);
  const leafletCurrent = currentLocation ? [currentLocation.latitude, currentLocation.longitude] : null;

  // Color based on inside/outside status
  const fillColor = isInside ? '#4CAF50' : '#F44336'; // Green if inside, red if outside
  const polygonBorder = isInside ? '#388E3C' : '#D32F2F';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          height: 100vh;
          width: 100%;
        }
        #map {
          height: 100%;
          width: 100%;
          z-index: 0;
        }
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
        }
        .info-panel {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: white;
          padding: 12px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-size: 12px;
          z-index: 1000;
          max-width: 280px;
        }
        .info-panel h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        .info-item {
          margin: 4px 0;
          color: #666;
          font-size: 11px;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          background: ${isInside ? '#e8f5e9' : '#ffebee'};
          color: ${isInside ? '#2e7d32' : '#c62828'};
          border-radius: 3px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 8px;
        }
        .live-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #FF5722;
          border-radius: 50%;
          animation: pulse 1s infinite;
          margin-right: 4px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="info-panel">
        <h4><span class="live-indicator"></span>Live Location</h4>
        <div class="info-item"><strong>Status:</strong> ${isInside ? '✅ INSIDE CLASSROOM' : '❌ OUTSIDE CLASSROOM'}</div>
        <div class="info-item"><strong>Center:</strong> ${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}</div>
        <div class="info-item"><strong>Vertices:</strong> ${polygon.length}</div>
        ${currentLocation ? `
          <div class="info-item"><strong>Your Location:</strong> ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}</div>
          ${currentLocation.accuracy ? `<div class="info-item"><strong>Accuracy:</strong> ${currentLocation.accuracy.toFixed(1)}m</div>` : ''}
          <div class="badge">${isInside ? '✅ Inside Classroom' : '❌ Outside Classroom'}</div>
        ` : ''}
      </div>

      <script>
        // Initialize map
        const map = L.map('map').setView([${centerLat}, ${centerLon}], 19);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 21,
          attribution: '© OpenStreetMap contributors',
          className: 'map-tiles'
        }).addTo(map);

        // Add polygon with color based on inside/outside status
        const polygon = L.polygon(${JSON.stringify(leafletPolygon)}, {
          color: '${polygonBorder}',
          weight: 3,
          opacity: 0.9,
          fillColor: '${fillColor}',
          fillOpacity: 0.2
        }).addTo(map);

        // Add center marker
        L.circleMarker([${centerLat}, ${centerLon}], {
          radius: 6,
          fillColor: '#FF9800',
          color: '#F57C00',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map)
          .bindPopup('<strong>Classroom Center</strong><br/>${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}');

        // Add polygon vertices
        ${polygon
          .map(
            ([lon, lat], idx) =>
              `
          L.circleMarker([${lat}, ${lon}], {
            radius: 4,
            fillColor: '#${isInside ? '4CAF50' : 'FF6F00'}',
            color: '#${isInside ? '388E3C' : 'E65100'}',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7
          }).addTo(map)
            .bindPopup('<strong>Vertex ${idx + 1}</strong><br/>${lat.toFixed(6)}, ${lon.toFixed(6)}');
        `
          )
          .join('\n')}

        // Add current location if provided
        ${
          leafletCurrent
            ? `
          L.circleMarker([${leafletCurrent[0]}, ${leafletCurrent[1]}], {
            radius: 10,
            fillColor: '#E91E63',
            color: '#C2185B',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.95
          }).addTo(map)
            .bindPopup(
              '<strong>📍 Your Location</strong><br/>' +
              '${leafletCurrent[0].toFixed(6)}, ${leafletCurrent[1].toFixed(6)}'
            )
            .openPopup();

          // Add accuracy circle if available
          ${
            currentLocation?.accuracy
              ? `
            L.circle([${leafletCurrent[0]}, ${leafletCurrent[1]}], {
              radius: ${currentLocation.accuracy},
              color: '#E91E63',
              weight: 1,
              opacity: 0.3,
              fillColor: '#E91E63',
              fillOpacity: 0.05,
              dashArray: '5, 5'
            }).addTo(map)
              .bindPopup('<strong>GPS Accuracy</strong><br/>${currentLocation.accuracy.toFixed(1)}m radius');
          `
              : ''
          }
        `
            : ''
        }

        // Fit map to polygon bounds
        map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

        // Add scale
        L.control.scale({ imperial: false, metric: true }).addTo(map);

        // Refresh map on resize (important for WebView)
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      </script>
    </body>
    </html>
  `;
};

export default function MapPolygonVisualization({
  polygon,
  currentLocation,
  isInside = false,
  title = 'Classroom Location',
  height = 400,
}: MapPolygonVisualizationProps) {
  const mapHTML = useMemo(
    () => createMapHTML(polygon, currentLocation, title, isInside),
    [polygon, currentLocation, title, isInside]
  );

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHTML }}
        style={styles.webView}
        scrollEnabled={false}
        scalesPageToFit={true}
        startInLoadingState={true}
        key={mapHTML} // Force re-render on HTML change
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  webView: {
    flex: 1,
  },
});
