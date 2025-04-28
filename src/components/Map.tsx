'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Museum型定義
type Museum = {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

// Leafletコンポーネントを動的import
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});

export default function Map({ museums }: { museums: Museum[] }) {
  useEffect(() => {
    import('leaflet').then((L) => {
      const DefaultIcon = L.icon({
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;
    });
  }, []);

  return (
    <MapContainer
      center={[36.2048, 138.2529]}
      zoom={5}
      scrollWheelZoom={true}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {museums.map((museum) =>
        museum.latitude && museum.longitude ? (
          <Marker
            key={museum.id}
            position={[museum.latitude, museum.longitude]}
          >
            <Popup>
              <strong>{museum.name}</strong>
              <br />
              {museum.address}
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
