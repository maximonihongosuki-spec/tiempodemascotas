'use client';
import React from 'react';

type PaymentTickerClientProps = {
  initialData?: {
    payment_logo_1?: string | null;
    payment_logo_2?: string | null;
    payment_logo_3?: string | null;
    payment_logo_4?: string | null;
    payment_logo_5?: string | null;
    payment_logo_6?: string | null;
  } | null;
};

export default function PaymentTickerClient({ initialData }: PaymentTickerClientProps) {
  if (!initialData) return null;

  const logos = [
    initialData.payment_logo_1,
    initialData.payment_logo_2,
    initialData.payment_logo_3,
    initialData.payment_logo_4,
    initialData.payment_logo_5,
    initialData.payment_logo_6,
  ].filter(Boolean) as string[];

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
