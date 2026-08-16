'use client';
import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function WhatsAppButton() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsapp247, setWhatsapp247] = useState('');

  useEffect(() => {
    loadWhatsAppNumbers();
  }, []);

  const loadWhatsAppNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('whatsapp_number, whatsapp_enabled')
        .single();

      if (data && !error) {
        if (data.whatsapp_enabled) setWhatsappNumber(data.whatsapp_number);
      }
    } catch (error) {
      console.error('Error loading WhatsApp number:', error);
    }
  };

  const handleManualClick = () => {
    if (whatsappNumber) {
      const message = encodeURIComponent('Hola, me gustaría recibir más información.');
      window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  const handle247Click = () => {
    if (whatsapp247) {
      const message = encodeURIComponent('Hola, necesito ayuda urgente del asistente 24/7.');
      window.open(`https://wa.me/${whatsapp247.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="fixed bottom-[88px] md:bottom-[112px] right-4 md:right-6 flex flex-col-reverse gap-3 md:gap-4 z-50 pointer-events-none items-center">
      {whatsapp247 && (
        <button
          onClick={handle247Click}
          className="pointer-events-auto w-14 h-14 md:w-16 md:h-16 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-all flex items-center justify-center relative group"
          aria-label="Atención IA 24/7"
        >
          <div className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping -z-10"></div>
          <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg border border-white z-10">24/7</div>
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
          <span className="absolute right-full mr-4 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">IA Asistente 24/7</span>
        </button>
      )}

      {whatsappNumber && (
        <button
          onClick={handleManualClick}
          className="pointer-events-auto w-14 h-14 md:w-16 md:h-16 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-all flex items-center justify-center relative group"
          aria-label="Contactar Ventas"
        >
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
          <span className="absolute right-full mr-4 bg-white text-black text-[9px] font-black uppercase px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-100">Ventas Directas</span>
        </button>
      )}
    </div>
  );
}