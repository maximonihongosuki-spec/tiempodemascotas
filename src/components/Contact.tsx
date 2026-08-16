'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Send, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState({ 
    business_email: '', 
    business_address: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: ''
  });

  useEffect(() => {
    fetchLocations();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('business_email, business_address, whatsapp_number, facebook_url, instagram_url, tiktok_url').single();
    if (data) setSettings(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
    if (data) setLocations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        customer_name: name,
        customer_email: email,
        subject: subject,
        message: message,
      });

      if (error) throw error;

      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje. Por favor intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-display font-black text-center text-[#1A8A00] mb-4 uppercase tracking-tight">
          CONTÁCTANOS
        </h2>
        <div className="w-16 h-1.5 bg-[#1A8A00] mx-auto mb-16 rounded-full"></div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-display font-bold text-[#1A8A00] mb-6">
                Encuéntranos
              </h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:shadow-md transition-all group">
                  <div className="bg-white p-3 rounded-full text-[#1A8A00] group-hover:scale-110 transition-transform shadow-sm">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-[#1E1B4B] text-lg mb-2">Dirección</h4>
                    <div className="grid gap-4">
                      {locations.map(loc => (
                        <div key={loc.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                          <p className="font-bold text-[#1E1B4B] mb-1">{loc.name}</p>
                          <p className="text-sm text-gray-500">{loc.address}</p>
                        </div>
                      ))}
                      {locations.length === 0 && (
                        <div>
                           <p className="font-bold text-[#1E1B4B] mb-1">Clínica & Tienda</p>
                           <p className="text-sm text-gray-500">Asunción, Paraguay</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:shadow-md transition-all group">
                  <div className="bg-white p-3 rounded-full text-[#228B22] group-hover:scale-110 transition-transform shadow-sm">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-[#1E1B4B] text-lg mb-2">Escríbenos</h4>
                    <p className="text-gray-500 text-sm mb-3">{settings.business_email || 'contacto@tiempodemascotas.com'}</p>
                    <p className="text-xs font-bold text-[#228B22] uppercase tracking-widest mt-1">Síguenos</p>
                    <div className="flex gap-3 mt-2">
                       <Facebook className="text-[#1A8A00] hover:text-[#228B22] transition-colors cursor-pointer" size={20} />
                       <Instagram className="text-[#1A8A00] hover:text-[#228B22] transition-colors cursor-pointer" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-6">
                <MessageCircle className="w-6 h-6 text-[#228B22]" />
                <h3 className="text-2xl font-display font-bold text-[#1E1B4B]">
                Envíanos un mensaje
                </h3>
            </div>

            {success && (
              <div className="mb-6 p-4 bg-green-50 text-[#1A8A00] rounded-2xl font-bold text-sm text-center border border-green-100 shadow-sm animate-fade-in">
                ¡Mensaje recibido! Te responderemos lo antes posible.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-[#F3F4F6] bg-[#FAFAFA] rounded-2xl focus:ring-0 focus:border-[#C8E600] focus:bg-white outline-none transition-all font-medium text-[#1E1B4B] placeholder:text-[#9CA3AF]"
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  placeholder="Tu Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-[#F3F4F6] bg-[#FAFAFA] rounded-2xl focus:ring-0 focus:border-[#C8E600] focus:bg-white outline-none transition-all font-medium text-[#1E1B4B] placeholder:text-[#9CA3AF]"
                />
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Asunto"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-6 py-4 border-2 border-[#F3F4F6] bg-[#FAFAFA] rounded-2xl focus:ring-0 focus:border-[#C8E600] focus:bg-white outline-none transition-all font-medium text-[#1E1B4B] placeholder:text-[#9CA3AF]"
                />
              </div>

              <div>
                <textarea
                  required
                  placeholder="¿En qué podemos ayudarte?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-6 py-4 border-2 border-[#F3F4F6] bg-[#FAFAFA] rounded-2xl focus:ring-0 focus:border-[#C8E600] focus:bg-white outline-none transition-all font-medium text-[#1E1B4B] placeholder:text-[#9CA3AF] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-[#1A8A00] text-white py-4 rounded-2xl hover:bg-[#228B22] hover:scale-[1.02] transition-all font-display font-bold uppercase text-sm tracking-wider shadow-md active:scale-95"
              >
                {sending ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}