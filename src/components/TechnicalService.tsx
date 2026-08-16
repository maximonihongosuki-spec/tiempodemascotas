import { useState, useEffect } from 'react';
import { Sparkles, Star, ShieldCheck, Heart, CheckCircle, MessageCircle, Ruler, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TechnicalService() {
  const [settings, setSettings] = useState({ whatsapp_number: '595971207356' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('whatsapp_number').single();
    if (data) setSettings(data);
  };

  const services = [
    { icon: Ruler, title: 'Fitting Perfecto', desc: 'Asesoría en talles y calces para que cada prenda te quede impecable.' },
    { icon: Sparkles, title: 'Calidad Premium', desc: 'Textiles seleccionados que resisten el uso y mantienen su color.' },
    { icon: Heart, title: 'Style Advice', desc: 'Sugerencias personalizadas de outfits según tu estilo de vida.' },
    { icon: ShieldCheck, title: 'Compra Segura', desc: 'Garantía de originalidad en todas nuestras marcas y accesorios.' }
  ];

  return (
    <div className="bg-black text-white py-16 md:py-32 relative overflow-hidden border-y border-[#D4AF37]/10">
      <div className="absolute top-0 right-0 p-20 opacity-5 scale-[2] pointer-events-none hidden md:block text-[#D4AF37]">
        <Star className="w-64 h-64" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12 md:mb-24">
          <div className="inline-block px-4 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full text-[#D4AF37] text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6 md:mb-8">
            Experience La Positiva
          </div>
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-6 md:mb-8">
            SERVICIOS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#C5A059]">EXCLUSIVOS</span>
          </h2>
          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-medium">
            Más que una tienda, somos tu aliado para potenciar tu imagen con lo mejor del sport-urban paraguayo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 md:mb-20">
          {services.map((s, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 hover:bg-[#D4AF37] transition-all group duration-500">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-[#D4AF37]/20 group-hover:bg-white group-hover:border-white transition-colors">
                <s.icon className="w-6 h-6 md:w-7 md:h-7 text-[#D4AF37] group-hover:text-[#D4AF37]" />
              </div>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-3 md:mb-4">{s.title}</h3>
              <p className="text-slate-500 group-hover:text-white transition-colors font-medium text-xs md:text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[#D4AF37] to-[#C5A059] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-6 leading-none">¿Visitás nuestro local?</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {[
                { icon: CheckCircle, text: 'Probador VIP' },
                { icon: Clock, text: 'Pick Up Lambaré' },
                { icon: ShieldCheck, text: 'Talles XXL-S' },
                { icon: MessageCircle, text: 'Atención Directa' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/90 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                  <item.icon className="w-3 h-3 md:w-4 md:h-4" /> {item.text}
                </div>
              ))}
            </div>
          </div>
          <a
            href={`https://wa.me/${settings.whatsapp_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto px-8 py-4 md:px-10 md:py-5 bg-black text-[#D4AF37] rounded-2xl hover:scale-105 transition-all font-black uppercase tracking-widest text-xs md:text-sm shadow-2xl flex items-center justify-center gap-3"
          >
            <MessageCircle className="w-5 h-5" />
            Consultar Stock Ahora
          </a>
        </div>
      </div>
    </div>
  );
}