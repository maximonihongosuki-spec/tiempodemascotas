'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PaymentTicker() {
  const [logos, setLogos] = useState<string[]>([]);

  useEffect(() => {
    const loadLogos = async () => {
      try {
        const { data } = await supabase
          .from('home_content')
          .select('payment_logo_1, payment_logo_2, payment_logo_3, payment_logo_4, payment_logo_5, payment_logo_6')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();
        if (data) {
          const loaded = [
            data.payment_logo_1,
            data.payment_logo_2,
            data.payment_logo_3,
            data.payment_logo_4,
            data.payment_logo_5,
            data.payment_logo_6,
          ].filter(Boolean) as string[];
          setLogos(loaded);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadLogos();
  }, []);

  if (logos.length === 0) return null;

  const repeated = [...logos, ...logos, ...logos];

  return (
    <section className="py-6 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6 mb-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">
          Métodos de pago aceptados
        </p>
      </div>
      <div className="overflow-hidden">
        <div
          className="flex gap-8 items-center"
          style={{
            animation: 'paymentTicker 20s linear infinite',
            width: 'max-content',
          }}
        >
          {repeated.map((logo, i) => (
            <img
              key={i}
              src={logo}
              alt={`Método de pago ${i + 1}`}
              className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              loading="lazy"
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes paymentTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </section>
  );
}
