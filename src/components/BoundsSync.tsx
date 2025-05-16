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

    // 並び順が違っても同一判定されるようにソートして比較
    const sortedNew = [...visibleIds].sort((a, b) => a - b);
    const sortedPrev = [...prevIdsRef.current].sort((a, b) => a - b);
    const changed =
      sortedNew.length !== sortedPrev.length ||
      !sortedNew.every((id, idx) => id === sortedPrev[idx]);

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
    // 初回マウント時のみ実行（map取得後）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
