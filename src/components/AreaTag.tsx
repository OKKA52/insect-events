// components/AreaTag.tsx

'use client';

import { areaClassMap } from '@/utils/areaStyles';

export default function AreaTag({ area }: { area: string }) {
  const className = areaClassMap[area] ?? 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-block shrink-0 self-start rounded border border-gray-300 px-3 py-1 text-xs font-semibold md:text-sm ${className}`}
    >
      {area}
    </span>
  );
}
