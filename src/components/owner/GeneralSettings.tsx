import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Globe, MessageSquare, LayoutTemplate, Facebook, Instagram, Twitter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseAuth } from '../../lib/supabase-auth';
import PaymentProofsManager from './PaymentProofsManager';
import { uploadImageToStorage, assertNoBase64 } from '../../lib/imageUpload';

type SiteSettings = {
  business_name: string;
  business_email: string;
  business_address: string;
  logo_url: string;
  uploaded_logo_url: string;
  favicon_url: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  whatsapp_24_7: string;
  facebook_enabled: boolean;
  facebook_url: string;
  instagram_enabled: boolean;
  instagram_url: string;
  tiktok_enabled: boolean;
  tiktok_url: string;
  x_enabled: boolean;
  x_url: string;
  show_out_of_stock: boolean;
  delivery_min_amount: number | null;
  free_delivery_min_amount: number | null;
  transfer_bank: string;
  transfer_account: string;
  transfer_holder: string;
  brand_seal_url?: string;
  brand_seal_cloudinary_id?: string;
  og_image_url?: string;
};

export default function GeneralSettings() {
  const [settings, setSettings] = useState<SiteSettings>({
    business_name: '',
    business_email: '',
    business_address: '',
    logo_url: '',
    uploaded_logo_url: '',
    favicon_url: '',
    whatsapp_number: '',
    whatsapp_enabled: true,
    whatsapp_24_7: '',
    facebook_enabled: false,
    facebook_url: '',
    instagram_enabled: false,
    instagram_url: '',
    tiktok_enabled: false,
    tiktok_url: '',
    x_enabled: false,
    x_url: '',
    show_out_of_stock: false,
    delivery_min_amount: 100000,
    free_delivery_min_amount: null,
    transfer_bank: '',
    transfer_account: '',
    transfer_holder: '',
    brand_seal_url: '',
    brand_seal_cloudinary_id: '',
    og_image_url: '',
  });
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);
  const [brandSealUrl, setBrandSealUrl] = useState<string>('');
  const [brandSealUploading, setBrandSealUploading] = useState(false);

  type DeliveryZone = {
    id: string;
    name: string;
    price: number;
    is_active: boolean;
    order_index: number;
  };

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [newZone, setNewZone] = useState({ name: '', price: 0 });
  const [loadingZones, setLoadingZones] = useState(false);

  useEffect(() => {
    loadSettings();
    loadZones();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (data && !error) {
        console.log('SITE SETTINGS COLUMNS:', Object.keys(data));
        setSettings(data);
        setSettingsForm(data);
        setBrandSealUrl(data.brand_seal_url || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImageToStorage(file, 'site-assets');
      setSettingsForm(prev => ({ ...prev, logo_url: url }));
    } catch (error: any) {
      alert('Error al subir logo: ' + error.message);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImageToStorage(file, 'site-assets');
      setSettingsForm(prev => ({ ...prev, favicon_url: url }));
    } catch (error: any) {
      alert('Error al subir favicon: ' + error.message);
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImageToStorage(file, 'site-assets');
      setSettingsForm(prev => ({ ...prev, og_image_url: url }));
    } catch (error: any) {
      alert('Error al subir imagen OG: ' + error.message);
    }
  };

  const handleBrandSealUpload = async (file: File) => {
    setBrandSealUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'gnbxephy'); // mismo preset que native-webp.ts

      const res = await fetch('https://api.cloudinary.com/v1_1/draxdgeec/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const publicUrl = data.secure_url;
      const publicId = data.public_id;

      const { error } = await supabase
        .from('site_settings')
        .update({ brand_seal_url: publicUrl, brand_seal_cloudinary_id: publicId })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;
      setBrandSealUrl(publicUrl);
      setSettings(prev => ({ ...prev, brand_seal_url: publicUrl, brand_seal_cloudinary_id: publicId }));
      setSettingsForm(prev => ({ ...prev, brand_seal_url: publicUrl, brand_seal_cloudinary_id: publicId }));
      alert('✅ Sello de marca actualizado.');
    } catch (err: any) {
      alert('Error al subir sello: ' + err.message);
    } finally {
      setBrandSealUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Only extract the fields that are actually part of the form
      // This prevents errors with unknown or uneditable columns
      const updateData = {
        business_name: settingsForm.business_name,
        business_email: settingsForm.business_email,
        business_address: settingsForm.business_address,
        logo_url: settingsForm.logo_url,
        favicon_url: settingsForm.favicon_url,
        whatsapp_number: settingsForm.whatsapp_number,
        whatsapp_enabled: settingsForm.whatsapp_enabled,
        facebook_url: settingsForm.facebook_url,
        instagram_url: settingsForm.instagram_url,
        tiktok_url: settingsForm.tiktok_url,
        show_out_of_stock: settingsForm.show_out_of_stock,
        delivery_min_amount: settingsForm.delivery_min_amount,
        free_delivery_min_amount: settingsForm.free_delivery_min_amount,
        transfer_bank: settingsForm.transfer_bank,
        transfer_account: settingsForm.transfer_account,
        transfer_holder: settingsForm.transfer_holder,
        og_image_url: settingsForm.og_image_url
      };
      
      assertNoBase64(updateData);
      
      const { error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        console.error('Supabase error details:', error);
        alert(`Error Supabase: ${error.message || JSON.stringify(error)}`);
        throw error;
      }
      setSettings(settingsForm);
      setEditingSettings(false);
      alert('Configuración actualizada correctamente.');
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (!error.message) {
        alert('Error al guardar la configuración');
      }
    }
  };

  const loadZones = async () => {
    setLoadingZones(true);
    const { data } = await supabaseAuth
      .from('delivery_zones')
      .select('*')
      .order('order_index', { ascending: true });
    if (data) setZones(data);
    setLoadingZones(false);
  };

  const handleAddZone = async () => {
    if (!newZone.name.trim()) return;
    const { data, error } = await supabaseAuth
      .from('delivery_zones')
      .insert([{ 
        name: newZone.name.trim(), 
        price: newZone.price,
        order_index: zones.length 
      }])
      .select()
      .single();
    if (data && !error) {
      setZones(prev => [...prev, data]);
      setNewZone({ name: '', price: 0 });
    } else {
      console.error('Error al agregar zona:', error);
      alert('Error al agregar zona. Verificá que estés logueado como owner.');
    }
  };

  const handleUpdateZone = async (id: string, updates: Partial<DeliveryZone>) => {
    const { error } = await supabaseAuth
      .from('delivery_zones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    const { error } = await supabaseAuth
      .from('delivery_zones')
      .delete()
      .eq('id', id);
    if (!error) setZones(prev => prev.filter(z => z.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">Configuración General</h2>
          <p className="text-gray-500 text-sm mt-1">Información básica y contacto del negocio</p>
        </div>
        {!editingSettings ? (
          <button onClick={() => setEditingSettings(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
            Editar Información
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSaveSettings} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
              Guardar Cambios
            </button>
            <button onClick={() => { setEditingSettings(false); setSettingsForm(settings); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm">
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Identidad Visual
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <div className="w-full h-32 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {settingsForm.uploaded_logo_url || settingsForm.logo_url ? (
                    <img src={settingsForm.uploaded_logo_url || settingsForm.logo_url} className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-8 h-8" />
                  )}
                  {editingSettings && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-bold uppercase">Cambiar</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <div className="w-24 h-24 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {settingsForm.favicon_url ? (
                    <img src={settingsForm.favicon_url} className="w-12 h-12 object-contain" />
                  ) : (
                    <LayoutTemplate className="text-gray-300 w-8 h-8" />
                  )}
                  {editingSettings && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <span className="text-white text-xs font-bold uppercase">Subir</span>
                      <input type="file" accept="image/png,image/x-icon,image/jpeg" onChange={handleFaviconUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de Compartido (Open Graph - 1200x630)</label>
              <div className="w-full h-40 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative group">
                {settingsForm.og_image_url ? (
                  <img src={settingsForm.og_image_url} className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="text-gray-300 w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs text-gray-400">1200 x 630 px recomendado</span>
                  </div>
                )}
                {editingSettings && (
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <span className="text-white text-xs font-bold uppercase">Subir Imagen OG</span>
                    <input type="file" accept="image/*" onChange={handleOgImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
              <input
                type="text"
                disabled={!editingSettings}
                value={settingsForm.business_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del Negocio</label>
              <input
                type="text"
                disabled={!editingSettings}
                value={settingsForm.business_address}
                onChange={(e) => setSettingsForm({ ...settingsForm, business_address: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                placeholder="Ej: Av. Principal 123, Ciudad"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
              <label className="text-sm font-bold text-gray-700 block mb-1">
                🛡️ Sello de marca
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Imagen distintiva que se puede aplicar sobre las fotos de productos mejoradas
                con IA, para identificar que son propiedad de Tiempo de Mascotas.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {brandSealUrl ? (
                    <img src={brandSealUrl} alt="Sello de marca" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl text-gray-300">🛡️</span>
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors">
                  {brandSealUploading ? 'Subiendo...' : 'Subir sello'}
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="hidden"
                    disabled={brandSealUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBrandSealUpload(file);
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                Recomendado: PNG con fondo transparente, mínimo 200×200px.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Redes Sociales
            </h3>
            
            <div className="space-y-3">
              {[
                { icon: Facebook, key: 'facebook', label: 'Facebook', color: 'text-blue-600' },
                { icon: Instagram, key: 'instagram', label: 'Instagram', color: 'text-pink-600' },
                { icon: Twitter, key: 'x', label: 'Twitter / X', color: 'text-black' }
              ].map((social) => (
                <div key={social.key} className="flex items-center gap-3">
                  <social.icon size={20} className={social.color} />
                  <input
                    type="text"
                    disabled={!editingSettings}
                    value={(settingsForm as any)[`${social.key}_url`]}
                    onChange={e => setSettingsForm({...settingsForm, [`${social.key}_url`]: e.target.value, [`${social.key}_enabled`]: !!e.target.value})}
                    placeholder={`URL de ${social.label}`}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm disabled:bg-gray-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Contacto
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Comercial</label>
              <input
                type="email"
                disabled={!editingSettings}
                value={settingsForm.business_email}
                onChange={(e) => setSettingsForm({ ...settingsForm, business_email: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Ventas (Manual)</label>
              <input
                type="text"
                disabled={!editingSettings}
                value={settingsForm.whatsapp_number}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 disabled:bg-gray-50"
                placeholder="Ej: 5959..."
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-bold text-blue-800 mb-1">WhatsApp 24/7 (IA)</label>
              <input
                type="text"
                disabled={!editingSettings}
                value={settingsForm.whatsapp_24_7}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_24_7: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-blue-200 disabled:bg-white/50"
                placeholder="Número para IA..."
              />
              <p className="text-xs text-blue-600 mt-1">Activa el botón flotante "IA 24/7" en la web.</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                🛒 Configuración de Catálogo
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900">Mostrar productos sin stock</p>
                  <p className="text-xs text-amber-700">Si está desactivado, solo se verán items con stock mayor a 0.</p>
                </div>
                <button
                  disabled={!editingSettings}
                  onClick={() => setSettingsForm({ ...settingsForm, show_out_of_stock: !settingsForm.show_out_of_stock })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    settingsForm.show_out_of_stock ? 'bg-amber-600' : 'bg-gray-300'
                  } ${!editingSettings ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settingsForm.show_out_of_stock ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENEDOR NUEVAS SECCIONES ─── */}
      <div className="mt-8 pt-8 border-t border-gray-100 grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* ─── SECCIÓN: DELIVERY ─── */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              🚚 Configuración de Delivery
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto mínimo para habilitar delivery (Gs.)
              </label>
              <input
                type="number"
                disabled={!editingSettings}
                value={settingsForm.delivery_min_amount ?? 100000}
                onChange={e => setSettingsForm({ ...settingsForm, delivery_min_amount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 disabled:bg-gray-50"
                placeholder="100000"
              />
              <p className="text-xs text-gray-400 mt-1">El carrito debe superar este monto para mostrar la opción de delivery.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Delivery gratuito a partir de (Gs.)</label>
                <button
                  disabled={!editingSettings}
                  onClick={() => setSettingsForm({ 
                    ...settingsForm, 
                    free_delivery_min_amount: settingsForm.free_delivery_min_amount === null ? 0 : null 
                  })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    settingsForm.free_delivery_min_amount !== null ? 'bg-[#166534]' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    settingsForm.free_delivery_min_amount !== null ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              {settingsForm.free_delivery_min_amount !== null && (
                <input
                  type="number"
                  disabled={!editingSettings}
                  value={settingsForm.free_delivery_min_amount}
                  onChange={e => setSettingsForm({ ...settingsForm, free_delivery_min_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 disabled:bg-gray-50"
                  placeholder="500000"
                />
              )}
              {settingsForm.free_delivery_min_amount === null && (
                <p className="text-xs text-gray-400">Desactivado — el delivery siempre tendrá el precio configurado en la zona.</p>
              )}
            </div>
          </div>

          {/* ─── SECCIÓN: TRANSFERENCIA ─── */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              🏦 Datos bancarios para transferencias
            </h3>
            {[
              { field: 'transfer_bank', label: 'Banco', placeholder: 'Ej: Banco Continental' },
              { field: 'transfer_account', label: 'Número de cuenta / CBU', placeholder: 'Ej: 000-1234567-0' },
              { field: 'transfer_holder', label: 'Titular de la cuenta', placeholder: 'Ej: María González' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type="text"
                  disabled={!editingSettings}
                  value={(settingsForm as any)[f.field] || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, [f.field]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 disabled:bg-gray-50"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {/* ─── SECCIÓN: ZONAS DE DELIVERY ─── */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2 flex items-center gap-2">
              📍 Zonas de delivery
            </h3>

            {/* Formulario nueva zona */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newZone.name}
                onChange={e => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de la zona (ej: Lambaré, Villa Morra)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#166534] outline-none"
              />
              <input
                type="number"
                value={newZone.price}
                onChange={e => setNewZone(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="Precio (Gs.)"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#166534] outline-none"
              />
              <button
                onClick={handleAddZone}
                disabled={!newZone.name.trim()}
                className="px-4 py-2 bg-[#166534] text-white rounded-lg text-sm font-bold hover:bg-[#064E3B] transition-colors disabled:opacity-40"
              >
                + Agregar
              </button>
            </div>

            {/* Lista de zonas */}
            {loadingZones ? (
              <p className="text-sm text-gray-400 text-center py-4">Cargando zonas...</p>
            ) : zones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 italic">
                No hay zonas configuradas. Agregá una arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {zones.map(zone => (
                  <div key={zone.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                    <input
                      type="text"
                      value={zone.name}
                      onChange={e => handleUpdateZone(zone.id, { name: e.target.value })}
                      onBlur={e => handleUpdateZone(zone.id, { name: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#166534]"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 font-bold">Gs.</span>
                      <input
                        type="number"
                        value={zone.price}
                        onChange={e => handleUpdateZone(zone.id, { price: Number(e.target.value) })}
                        onBlur={e => handleUpdateZone(zone.id, { price: Number(e.target.value) })}
                        className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#166534]"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={zone.is_active}
                        onChange={e => handleUpdateZone(zone.id, { is_active: e.target.checked })}
                        className="rounded text-[#166534]"
                      />
                      Activa
                    </label>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SECCIÓN: COMPROBANTES DE PAGO ─── */}
      <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2">
          🧾 Comprobantes de transferencia
        </h3>
        <PaymentProofsManager />
      </div>
    </div>
  );
}
