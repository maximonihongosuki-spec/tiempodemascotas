'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type TickerItem = {
  id: string;
  text: string;
  emoji: string;
  order_index: number;
};

export default function InlineTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const { data } = await supabase
          .from('ticker_items')
          .select('*')
          .eq('position', 'bottom')
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (data) setItems(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadItems();
  }, []);

  if (items.length === 0) return null;

  const repeated = [...items, ...items, ...items];

  return (
    <div className="w-full bg-[#eeee22] text-[#166534] text-[10px] md:text-xs font-bold py-2 overflow-hidden">
      <div
        className="flex gap-8 whitespace-nowrap"
        style={{ animation: 'ticker 30s linear infinite', width: 'max-content' }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
            <span>{item.emoji}</span>
            <span>{item.text}</span>
            <span className="text-[#166534]/40 ml-4">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
