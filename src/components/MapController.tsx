// components/MapController.tsx

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

type MapControllerProps = {
  resetKey: number;
};

export default function MapController({ resetKey }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    map.setView([36.2048, 138.2529], 5); // 日本中心・縮尺5
  }, [map, resetKey]);

  return null;
}
