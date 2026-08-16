'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { 
  Truck, Shield, Star, Heart, Award, Zap, Gift, Clock,
  PawPrint, ShoppingBag, Phone, MapPin, Percent, Tag,
  CheckCircle, Sparkles
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  'Truck': <Truck className="w-8 h-8" />,
  'Shield': <Shield className="w-8 h-8" />,
  'Star': <Star className="w-8 h-8" />,
  'Heart': <Heart className="w-8 h-8" />,
  'Award': <Award className="w-8 h-8" />,
  'Zap': <Zap className="w-8 h-8" />,
  'Gift': <Gift className="w-8 h-8" />,
  'Clock': <Clock className="w-8 h-8" />,
  'PawPrint': <PawPrint className="w-8 h-8" />,
  'ShoppingBag': <ShoppingBag className="w-8 h-8" />,
  'Phone': <Phone className="w-8 h-8" />,
  'MapPin': <MapPin className="w-8 h-8" />,
  'Percent': <Percent className="w-8 h-8" />,
  'Tag': <Tag className="w-8 h-8" />,
  'CheckCircle': <CheckCircle className="w-8 h-8" />,
  'Sparkles': <Sparkles className="w-8 h-8" />,
};

type RibbonData = {
  ribbon_1_title?: string | null;
  ribbon_1_text?: string | null;
  ribbon_1_icon?: string | null;
  ribbon_1_url?: string | null;
  ribbon_2_title?: string | null;
  ribbon_2_text?: string | null;
  ribbon_2_icon?: string | null;
  ribbon_2_url?: string | null;
  ribbon_3_title?: string | null;
  ribbon_3_text?: string | null;
  ribbon_3_icon?: string | null;
  ribbon_3_url?: string | null;
  ribbon_4_title?: string | null;
  ribbon_4_text?: string | null;
  ribbon_4_icon?: string | null;
  ribbon_4_url?: string | null;
};

export default function RibbonCards() {
  const [data, setData] = useState<RibbonData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: d } = await supabase
          .from('home_content')
          .select('ribbon_1_title, ribbon_1_text, ribbon_1_icon, ribbon_1_url, ribbon_2_title, ribbon_2_text, ribbon_2_icon, ribbon_2_url, ribbon_3_title, ribbon_3_text, ribbon_3_icon, ribbon_3_url, ribbon_4_title, ribbon_4_text, ribbon_4_icon, ribbon_4_url')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();
        if (d) setData(d);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  if (!data) return null;

  const cards = [
    { title: data.ribbon_1_title, text: data.ribbon_1_text, icon: data.ribbon_1_icon, url: data.ribbon_1_url },
    { title: data.ribbon_2_title, text: data.ribbon_2_text, icon: data.ribbon_2_icon, url: data.ribbon_2_url },
    { title: data.ribbon_3_title, text: data.ribbon_3_text, icon: data.ribbon_3_icon, url: data.ribbon_3_url },
    { title: data.ribbon_4_title, text: data.ribbon_4_text, icon: data.ribbon_4_icon, url: data.ribbon_4_url },
  ].filter(c => c.title);

  if (cards.length === 0) return null;

  return (
    <section className="py-6 bg-[#FAFFD1]/50 border-y border-[#eeee22]/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
          {cards.map((card, i) => {
            const content = (
              <div className="flex flex-col items-center text-center p-4 gap-3 h-full min-w-0 group-hover:scale-105 transition-transform duration-300">
                <div className="w-14 h-14 bg-[#1A8A00] text-white rounded-2xl flex items-center justify-center shadow-md shrink-0 group-hover:bg-[#064E3B] transition-colors">
                  {ICON_MAP[card.icon || ''] || <PawPrint className="w-8 h-8" />}
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-display font-black text-[#1A8A00] text-xs md:text-sm uppercase leading-tight break-words">{card.title}</p>
                  {card.text && <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 leading-snug break-words">{card.text}</p>}
                </div>
              </div>
            );

            return card.url ? (
              <Link key={i} href={card.url} className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-[#eeee22]/20 hover:border-[#eeee22] overflow-hidden h-full">
                {content}
              </Link>
            ) : (
              <div key={i} className="group bg-white rounded-2xl shadow-sm border border-[#eeee22]/20 overflow-hidden h-full">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
