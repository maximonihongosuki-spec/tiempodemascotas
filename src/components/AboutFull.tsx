'use client';
import { useState, useEffect } from 'react';
import { supabase, Location } from '../lib/supabase';
import { Sparkles, Heart, Shield, PawPrint } from 'lucide-react';

export default function AboutFull() {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    supabase.from('locations').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setLocations(data); });
  }, []);

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-white">
      {/* Decoración muy sutil, sin fondos amarillos */}
      <div className="absolute bottom-10 left-10 text-[#166534] opacity-5">
        <PawPrint size={80} fill="currentColor" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">

          {/* Encabezado */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8 text-center md:text-left">
            <div className="flex-1">
              <h1 className="text-5xl md:text-7xl font-display font-black text-[#1A8A00] tracking-tight leading-none mb-4 uppercase">
                TIEMPO DE <br />
                <span className="text-[#166534]">MASCOTAS</span>
              </h1>
              <div className="w-32 h-1.5 bg-[#166534] rounded-full mx-auto md:mx-0" />
            </div>
            <p className="flex-1 text-gray-600 font-medium text-lg md:text-xl max-w-md leading-relaxed">
              Comprometidos con el bienestar de tus mascotas. Ofrecemos los 
              mejores alimentos, medicamentos y accesorios de primera calidad.
            </p>
          </div>

          {/* Compromiso */}
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-7">
              <div className="bg-white text-[#1A8A00] p-10 md:p-14 rounded-[3rem] shadow-lg border border-[#166534]/10 relative overflow-hidden group h-full">
                <div className="absolute -top-10 -right-10 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 text-[#166534]">
                  <Sparkles className="w-64 h-64" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-black mb-6 flex items-center gap-3">
                  <Shield className="w-8 h-8 fill-current text-[#166534]" /> Nuestro Compromiso
                </h2>
                <p className="text-gray-700 leading-relaxed text-lg md:text-xl mb-10 font-medium">
                  En Tiempo de Mascotas, entendemos que tu mascota es parte de tu familia. 
                  Por eso, seleccionamos cuidadosamente los mejores productos para asegurar 
                  que tengan una vida larga, saludable y divertida.
                </p>
                <div className="flex flex-wrap gap-3">
                  {locations.map(loc => (
                    <div key={loc.id} className="px-6 py-3 rounded-2xl bg-[#F9FAFB] border border-gray-200 text-[#1A8A00] font-display font-bold text-sm">
                      📍 {loc.name}
                    </div>
                  ))}
                  {locations.length === 0 && (
                    <div className="px-6 py-3 rounded-2xl bg-[#F9FAFB] border border-gray-200 text-[#1A8A00] font-display font-bold text-sm">
                      📍 Sede Central
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white text-[#1E1B4B] p-10 rounded-[3rem] shadow-lg border border-[#166534]/10 hover:-translate-y-1 transition-transform">
                <h3 className="text-2xl font-display font-black mb-3 flex items-center gap-2 text-[#1A8A00]">
                  <Heart className="w-6 h-6 fill-current" /> Misión
                </h3>
                <p className="text-gray-700 font-medium leading-relaxed text-base">
                  Brindar salud y felicidad a las mascotas a través de alimentos, 
                  medicamentos y artículos especializados que mejoren su calidad de vida.
                </p>
              </div>

              <div className="bg-white text-[#1E1B4B] p-10 rounded-[3rem] border border-[#166534]/10 hover:-translate-y-1 transition-transform shadow-lg">
                <h3 className="text-2xl font-display font-black mb-3 text-[#1A8A00]">Visión</h3>
                <p className="text-gray-600 font-medium leading-relaxed text-base">
                  Ser la tienda líder en confianza y calidad, reconocida por nuestra 
                  dedicación incondicional al cuidado animal y la selección premium 
                  de nuestros productos.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
