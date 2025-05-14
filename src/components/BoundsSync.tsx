'use client';

import { useMapEvents } from 'react-leaflet';
import { useEffect, useCallback, useRef } from 'react';
import type L from 'leaflet';

type Museum = {
  id: number;
  latitude?: number;
  longitude?: number;
};

type BoundsSyncProps = {
  museums: Museum[];
  onChangeVisibleMuseumIds: (ids: number[]) => void;
};

export default function BoundsSync({ museums, onChangeVisibleMuseumIds }: BoundsSyncProps) {
  const mapRef = useRef<L.Map | null>(null);
  const prevIdsRef = useRef<number[]>([]);

  const updateVisible = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const visibleIds = museums
      .filter(
        (m) =>
          typeof m.latitude === 'number' &&
          typeof m.longitude === 'number' &&
          bounds.contains([m.latitude, m.longitude]),
      )
      .map((m) => m.id);

    const prevIds = prevIdsRef.current;
    const changed =
      visibleIds.length !== prevIds.length || !visibleIds.every((id, idx) => id === prevIds[idx]);

    if (changed) {
      prevIdsRef.current = visibleIds;
      onChangeVisibleMuseumIds(visibleIds);
    }
  }, [museums, onChangeVisibleMuseumIds]);

  const map = useMapEvents({
    moveend: updateVisible,
    zoomend: updateVisible,
  });

  mapRef.current = map;

  useEffect(() => {
    updateVisible();
  }, [updateVisible]);

  return null;
}
