'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1 bg-[#166534]/10 text-[#166534] text-xs font-display font-bold uppercase tracking-wider mb-4 rounded-full">
            Nosotros
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-black text-[#1A8A00] tracking-tight leading-none mb-6 uppercase">
            Tiempo de Mascotas
          </h2>
          <div className="w-24 h-1.5 bg-[#166534] rounded-full mx-auto mb-6" />
          <p className="text-gray-600 font-medium text-lg md:text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
            Comprometidos con el bienestar de tus mascotas. Ofrecemos los mejores 
            alimentos, medicamentos y accesorios de primera calidad.
          </p>
          <Link
            href="/nosotros"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#166534] hover:bg-[#064E3B] text-white rounded-full font-display font-bold text-sm uppercase tracking-wider transition-colors"
          >
            Conocenos más
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}