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
    const valid = museums.filter(
      (m) => m.latitude !== undefined && m.longitude !== undefined,
    );
    if (!valid.length) {
      map.setView([36.2048, 138.2529], 5);
      return;
    }

    const avgLat =
      valid.reduce((sum, m) => sum + (m.latitude ?? 0), 0) / valid.length;
    const avgLng =
      valid.reduce((sum, m) => sum + (m.longitude ?? 0), 0) / valid.length;

    map.flyTo([avgLat, avgLng], zoomLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, zoomLevel]);

  return null;
}
