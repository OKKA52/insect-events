'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMap } from 'react-leaflet';
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
  resetKey?: number;
  eventCounts?: Map<number, number>;
};

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});

const DEFAULT_CENTER: [number, number] = [36.2048, 138.2529];

function AutoFitBounds({ museums }: { museums: Museum[] }) {
  const map = useMap();

  useEffect(() => {
    const updateBounds = async () => {
      const pins = museums.filter((m) => m.latitude && m.longitude);
      const L = await import('leaflet');

      map.whenReady(() => {
        // invalidateSizeだけ即時
        try {
          map.invalidateSize();
        } catch (e) {
          console.warn('⚠️ invalidateSize error:', e);
        }

        // DOM安定まで2段階待つ
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              if (pins.length === 0) {
                map.setView([36.2048, 138.2529], 5);
              } else if (pins.length === 1) {
                map.setView([pins[0].latitude!, pins[0].longitude!], 9);
              } else {
                const bounds = L.latLngBounds(
                  pins.map((m) => [m.latitude!, m.longitude!] as [number, number]),
                );
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            } catch (err) {
              console.warn('❗ setView/fitBounds error:', err);
            }
          }, 50); // ← 50ms前後がベストバランス
        });
      });
    };

    updateBounds();
  }, [map, museums]);

  return null;
}

export default function Map({
  museums,
  onHoverMuseum,
  onClickMuseum,
  resetKey,
  eventCounts,
}: MapProps) {
  const [lastTappedMarkerId, setLastTappedMarkerId] = useState<number | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    import('leaflet').then((L) => {
      const DefaultIcon = L.icon({
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;
    });
  }, []);

  return (
    <div style={{ minHeight: '500px' }}>
      <MapContainer
        key={resetKey}
        center={DEFAULT_CENTER}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <AutoFitBounds museums={museums} /> {/* ← ✅ 常時表示でOK */}
        {museums.map((museum, index) => {
          if (!museum.latitude || !museum.longitude) return null;

          return (
            <Marker
              key={museum.id}
              position={[museum.latitude, museum.longitude]}
              eventHandlers={{
                mouseover: async (e) => {
                  if (!isMobile) {
                    const L = await import('leaflet');
                    e.target.setIcon(
                      L.icon({
                        iconUrl: '/leaflet/marker-icon-red.png',
                        shadowUrl: '/leaflet/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                      }),
                    );
                    e.target.openPopup();
                    onHoverMuseum(museum.id);
                  }
                },
                mouseout: async (e) => {
                  if (!isMobile) {
                    const L = await import('leaflet');
                    e.target.setIcon(
                      L.icon({
                        iconUrl: '/leaflet/marker-icon.png',
                        shadowUrl: '/leaflet/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                      }),
                    );
                  }
                },
                click: async (e) => {
                  if (isMobile) {
                    if (lastTappedMarkerId === museum.id) {
                      onHoverMuseum(museum.id);
                      onClickMuseum(museum.id);
                      setLastTappedMarkerId(null);
                    } else {
                      setLastTappedMarkerId(museum.id);
                      const L = await import('leaflet');
                      e.target.setIcon(
                        L.icon({
                          iconUrl: '/leaflet/marker-icon-red.png',
                          shadowUrl: '/leaflet/marker-shadow.png',
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                        }),
                      );
                      e.target.openPopup();
                    }
                  } else {
                    onHoverMuseum(museum.id);
                    onClickMuseum(museum.id);
                  }
                },
              }}
            >
              <Popup maxWidth={300} minWidth={200} offset={[0, -30]}>
                <div className='text-sm'>
                  {museum.image_url && (
                    <div className='relative mb-2 aspect-[4/3] h-32 w-full overflow-hidden rounded'>
                      <Image
                        src={museum.image_url}
                        alt={museum.name}
                        fill
                        priority={index === 0}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <h3 className='mb-1 text-base font-bold'>{museum.name}</h3>
                  <p className='mb-2 text-gray-600'>{museum.address}</p>

                  {eventCounts?.get(museum.id) !== undefined && (
                    <p className='mb-2 text-gray-800'>
                      開催イベント数: <strong>{eventCounts.get(museum.id)}</strong>
                    </p>
                  )}

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
    </div>
  );
}
