// components/MapController.tsx

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

type Museum = {
  latitude?: number;
  longitude?: number;
};

type MapControllerProps = {
  museums: Museum[];
  resetKey: number;
  zoomLevel?: number; // ← ★ここを追加（任意で受け取る）
};

export default function MapController({
  museums,
  resetKey,
  zoomLevel = 7,
}: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (museums.length === 0) {
      map.setView([36.2048, 138.2529], 5);
      return;
    }

    const valid = museums.filter(
      (m) => m.latitude !== undefined && m.longitude !== undefined,
    );
    if (!valid.length) return;

    const avgLat =
      valid.reduce((sum, m) => sum + (m.latitude ?? 0), 0) / valid.length;
    const avgLng =
      valid.reduce((sum, m) => sum + (m.longitude ?? 0), 0) / valid.length;

    map.flyTo([avgLat, avgLng], zoomLevel); // ← ★ここに反映
  }, [museums, resetKey, zoomLevel, map]);

  return null;
}
