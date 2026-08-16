'use client';
import { MapPin, Facebook, Instagram, Twitter, Mail, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, Location } from '../lib/supabase';

type SiteSettings = {
  business_name: string;
  logo_url: string;
  uploaded_logo_url: string;
  business_email: string;
  business_address: string;
  whatsapp_number: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  x_url: string;
};

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>({
    business_name: 'Tiempo de Mascotas',
    logo_url: '',
    uploaded_logo_url: '',
    business_email: '',
    business_address: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    x_url: ''
  });
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchLocations();

    const channel = supabase
      .channel('footer_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => fetchSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => fetchLocations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').single();
    if (data) setSettings(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
    if (data) setLocations(data);
  };

  return (
    <footer className="bg-gray-50 text-[#1E1B4B] py-16 border-t border-gray-200">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            {(settings.uploaded_logo_url || settings.logo_url) ? (
              <div className="bg-white rounded-2xl p-4 inline-block mb-6 shadow-sm border border-[#E0E7FF]">
                <img
                  src={settings.uploaded_logo_url || settings.logo_url}
                  alt={`${settings.business_name}`}
                  className="h-12 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
                <h3 className="text-3xl font-display font-black mb-6 text-[#1A8A00]">{settings.business_name}</h3>
            )}
            
            <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium bg-white/50 p-4 rounded-2xl">
              Ofrecemos el mejor alimento, medicamentos, juguetes y accesorios para el bienestar de tus mejores amigos.
            </p>
            <div className="flex gap-4">
              {settings.facebook_url && <a href={settings.facebook_url} target="_blank" className="w-10 h-10 bg-white flex items-center justify-center rounded-full text-[#1A8A00] hover:bg-[#1A8A00]/10 transition-all shadow-sm"><Facebook size={18} /></a>}
              {settings.instagram_url && <a href={settings.instagram_url} target="_blank" className="w-10 h-10 bg-white flex items-center justify-center rounded-full text-[#1A8A00] hover:bg-[#1A8A00]/10 transition-all shadow-sm"><Instagram size={18} /></a>}
              {settings.x_url && <a href={settings.x_url} target="_blank" className="w-10 h-10 bg-white flex items-center justify-center rounded-full text-[#1A8A00] hover:bg-[#1A8A00]/10 transition-all shadow-sm"><Twitter size={18} /></a>}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-6 text-[#1A8A00]">Nuestras Sedes</h3>
            <div className="space-y-6 text-sm text-gray-600">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-start space-x-3 group">
                  <div className="p-2 bg-white rounded-full text-[#228B22] group-hover:scale-110 transition-transform">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1E1B4B] mb-1">{loc.name}</p>
                    <p className="opacity-80 text-xs">{loc.address}</p>
                    {loc.phone && <p className="text-[#1A8A00] font-bold mt-1 text-xs">{loc.phone}</p>}
                    {loc.hours && <p className="text-[10px] font-bold text-[#9CA3AF] mt-1 bg-white px-2 py-0.5 rounded-md inline-block">{loc.hours}</p>}
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                 <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white rounded-full text-[#228B22]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1E1B4B] mb-1">Sede Central</p>
                    <p className="opacity-80 text-xs">Asunción, Paraguay</p>
                    <p className="text-[10px] font-bold text-[#9CA3AF] mt-1">LUN-SÁB 08:00 - 20:00</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-lg mb-6 text-[#1A8A00]">Atención al Cliente</h3>
            <div className="text-sm space-y-4 text-gray-600">
              {settings.business_email && (
                <div className="flex items-center gap-3 font-medium p-3 bg-white rounded-2xl shadow-sm border border-[#F0F0F0]">
                  <Mail size={18} className="text-[#228B22]" /> {settings.business_email}
                </div>
              )}
              
              <div className="pt-2">
                <a href="/politica-de-privacidad" className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-[#1A8A00] transition-colors">
                   Política de Privacidad
                </a>
              </div>

              <div className="pt-4">
                <p className="text-xs font-bold text-[#1A8A00] uppercase mb-3 tracking-widest">Nuestra Tienda</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white rounded-full border border-[#E5E7EB] text-xs font-bold text-gray-600 hover:border-[#1A8A00] cursor-default">Alimentos</span>
                  <span className="px-3 py-1 bg-white rounded-full border border-[#E5E7EB] text-xs font-bold text-gray-600 hover:border-[#1A8A00] cursor-default">Medicamentos</span>
                  <span className="px-3 py-1 bg-white rounded-full border border-[#E5E7EB] text-xs font-bold text-gray-600 hover:border-[#1A8A00] cursor-default">Juguetes</span>
                  <span className="px-3 py-1 bg-white rounded-full border border-[#E5E7EB] text-xs font-bold text-gray-600 hover:border-[#1A8A00] cursor-default">Accesorios</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini-mapa con navegación */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#1A8A00] uppercase mb-3 tracking-widest">
              Cómo llegar
            </p>
            <div className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] bg-gray-50 aspect-[4/3] shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.714168226228!2d-57.625597288782096!3d-25.313805677542774!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x945da9de44027695%3A0x1581d07698a73802!2sPETSHOP%20TIEMPO%20DE%20MASCOTAS!5e0!3m2!1ses!2spy!4v1783183438186!5m2!1ses!2spy"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Ubicación de Tiempo de Mascotas"
              />
            </div>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=-25.313805677542774,-57.62559728878209&destination_place_id=ChIJlXYCRN6pXZQROjinlnbQgRU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#1A8A00] hover:bg-[#064E3B] text-white rounded-2xl font-display font-black text-sm uppercase tracking-wider transition-colors shadow-md animate-pulse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
              Navegar
            </a>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-16 pt-8 text-center flex flex-col items-center">
          <p className="text-xs text-[#9CA3AF] mb-2 font-bold uppercase tracking-widest flex items-center gap-1">
            &copy; {new Date().getFullYear()} {settings.business_name} <Heart className="w-3 h-3 text-[#1A8A00] fill-current" /> Cuidando a tus mejores amigos.
          </p>
        </div>
      </div>
    </footer>
  );
}