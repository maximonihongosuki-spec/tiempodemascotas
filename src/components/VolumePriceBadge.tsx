'use client';
import { Tag } from 'lucide-react';
import { VolumePrice } from '../lib/supabase';
import { getDisplayVolumeLevels } from '../lib/volumePricing';

type Props = {
  volumePrices?: VolumePrice[] | null;
  basePrice: number;
  className?: string;
};

export default function VolumePriceBadge({ volumePrices, basePrice, className = '' }: Props) {
  const levels = getDisplayVolumeLevels(volumePrices, basePrice);
  if (levels.length === 0) return null;

  return (
    <div className={`relative group/vp inline-flex ${className}`} onClick={e => e.stopPropagation()}>
      <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center shadow-sm cursor-help">
        <Tag className="w-3 h-3" />
      </div>
      <div className="absolute bottom-full right-0 mb-1.5 w-max max-w-[220px] px-3 py-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover/vp:opacity-100 group-hover/vp:visible transition-all z-20 pointer-events-none shadow-lg">
        <p className="font-bold mb-1 text-[#eeee22]">Precio por cantidad</p>
        {levels.map(v => (
          <p key={v.id} className="leading-relaxed">
            {v.min_qty} a {v.max_qty} un. → Gs. {Number(v.price).toLocaleString('es-PY')} c/u
          </p>
        ))}
      </div>
    </div>
  );
}
