// components/AreaTag.tsx

'use client';

import { areaClassMap } from '@/utils/areaStyles';

export default function AreaTag({ area }: { area: string }) {
  const className = areaClassMap[area] ?? 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-block border border-gray-300 text-xs md:text-sm font-semibold px-3 py-1 rounded self-start shrink-0 ${className}`}
    >
      {area}
    </span>
  );
}
