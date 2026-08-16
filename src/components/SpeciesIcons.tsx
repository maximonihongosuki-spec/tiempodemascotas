'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

let cachedUrls: Record<string, string> | null = null;
let cachedPromise: Promise<Record<string, string>> | null = null;

async function fetchUrls(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('site_settings')
    .select('species_icon_urls')
    .single();
  cachedUrls = (data?.species_icon_urls as Record<string, string>) || {};
  return cachedUrls;
}

async function loadUrls(): Promise<Record<string, string>> {
  if (cachedUrls) return cachedUrls;
  if (!cachedPromise) {
    cachedPromise = fetchUrls();
  }
  return cachedPromise;
}

export function SpeciesIconRow({ species }: { species?: string[] | null }) {
  const [urls, setUrls] = useState<Record<string, string>>(cachedUrls || {});

  useEffect(() => {
    if (!cachedUrls) {
      loadUrls().then(setUrls);
    }
  }, []);

  const unique = Array.from(new Set(species || [])).filter(s => urls[s]);
  if (unique.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap mb-1" onClick={e => e.stopPropagation()}>
      {unique.map(sp => (
        <span
          key={sp}
          title={sp}
          className="w-[28px] h-[28px] md:w-[34px] md:h-[34px] rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5"
        >
          <img src={urls[sp]} alt={sp} className="w-full h-full object-contain" width={24} height={24} />
        </span>
      ))}
    </div>
  );
}
