'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

type Museum = {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  url?: string;
  instagram_url?: string;
  facebook_url?: string;
  x_url?: string;
  image_url?: string;
};

type MapProps = {
  museums: Museum[];
  onHoverMuseum: (_id: number | null) => void;
  onClickMuseum: (_id: number) => void;
};

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
// 地図コンポーネント
export default function Map({
  museums,
  onHoverMuseum,
  onClickMuseum,
}: MapProps) {
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

      {museums.map((museum) => {
        if (!museum.latitude || !museum.longitude) return null;

        return (
          <Marker
            key={museum.id}
            position={[museum.latitude, museum.longitude]}
            eventHandlers={{
              mouseover: (e) => {
                e.target.openPopup();
                onHoverMuseum(museum.id);
              },
              click: () => {
                onClickMuseum(museum.id);
              },
            }}
          >
            <Popup maxWidth={300} minWidth={200}>
              <div className='text-sm'>
                {museum.image_url && (
                  <div className='w-full h-32 relative rounded mb-2 overflow-hidden'>
                    <Image
                      src={museum.image_url}
                      alt={museum.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                <h3 className='text-base font-bold mb-1'>{museum.name}</h3>
                <p className='text-gray-600 mb-2'>{museum.address}</p>
                <div className='flex flex-wrap gap-2 text-xs'>
                  {museum.url && (
                    <a
                      href={museum.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 underline'
                    >
                      Webサイト
                    </a>
                  )}
                  {museum.instagram_url && (
                    <a
                      href={museum.instagram_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-pink-500'
                    >
                      Instagram
                    </a>
                  )}
                  {museum.facebook_url && (
                    <a
                      href={museum.facebook_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-700'
                    >
                      Facebook
                    </a>
                  )}
                  {museum.x_url && (
                    <a
                      href={museum.x_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-black'
                    >
                      X
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
