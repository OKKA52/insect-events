'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Leafletのマーカー画像設定もクライアント側で
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
import L from 'leaflet';

// デフォルトマーカー設定
const DefaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Museum型定義
type Museum = {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export default function Map({ museums }: { museums: Museum[] }) {
  return (
    <MapContainer
      center={[36.2048, 138.2529]} // 日本中心
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
