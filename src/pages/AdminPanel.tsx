'use client';
import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Save, Users, Webhook, X, Check, AlertTriangle, Palette, Eye, EyeOff, ChevronLeft, ChevronRight, Menu, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { supabaseAuth } from '../lib/supabase-auth';
import { uploadImageToStorage, assertNoBase64 } from '../lib/imageUpload';
import AIPromptConfigModal from '../components/owner/AIPromptConfigModal';

type AdminSettings = {
  chat_enabled: boolean;
  footer_credit_image_url: string;
  footer_credit_uploaded_image: string;
  owner_login_bg_color: string;
  owner_login_title: string;
  owner_login_subtitle: string;
  owner_login_logo_url: string;
  use_native_webp: boolean;
  use_native_categorization: boolean;
  native_ai_model: string;
  seo_ai_model: string;
};

type OwnerUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
};

type AiPromptBlock = {
  id: string;
  name: string;
  prompt_block: string;
  active: boolean;
  sort_order: number;
  context?: string;
};

type Section = 'usuarios' | 'webhooks' | 'apariencia' | 'sistema' | 'image-ai';

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<Section>('usuarios');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loadingWebhook, setLoadingWebhook] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [logoUrl, setLogoUrl] = useState('/image.png');

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    chat_enabled: true,
    footer_credit_image_url: '',
    footer_credit_uploaded_image: '',
    owner_login_bg_color: '#166534',
    owner_login_title: 'Tiempo de Mascotas',
    owner_login_subtitle: 'Panel de Gestión — Acceso para propietarios y administradores.',
    owner_login_logo_url: '',
    use_native_webp: false,
    use_native_categorization: false,
    native_ai_model: 'gpt-4o-mini',
    seo_ai_model: 'gpt-4o-mini',
  });

  const [ownerUsers, setOwnerUsers] = useState<OwnerUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<OwnerUser | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', password: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [aiPromptBlocks, setAiPromptBlocks] = useState<AiPromptBlock[]>([]);
  const [loadingAiBlocks, setLoadingAiBlocks] = useState(false);
  const [aiBlockForm, setAiBlockForm] = useState({ name: '', prompt_block: '' });
  const [editingAiBlock, setEditingAiBlock] = useState<AiPromptBlock | null>(null);
  const [savingAiBlock, setSavingAiBlock] = useState(false);
  const [selectedContext, setSelectedContext] = useState<string>('products');
  const [contextAiModel, setContextAiModel] = useState<string>('gpt-image-1.5');
  const [contextCredits, setContextCredits] = useState<number>(1);
  const [loadingContextModel, setLoadingContextModel] = useState(false);
  const [refImagesModalOpen, setRefImagesModalOpen] = useState(false);

  const contextLabel = (ctx: string) => {
    if (ctx === 'og_image') return 'OG Image (Redes Sociales)';
    if (ctx === 'products') return 'Productos';
    if (ctx === 'categorizar') return 'Categorizar IA';
    if (ctx === 'groups') return 'Grupos';
    if (ctx === 'hero_desktop') return 'Hero Banner';
    if (ctx === 'pet_cards') return 'Bentobox Mascotas';
    if (ctx === 'category_cards') return 'Tarjetas de Categoría';
    return ctx;
  };

  const allContexts = Array.from(new Set(aiPromptBlocks.map((b: any) => b.context || 'products')));
  ['products', 'categorizar', 'groups', 'hero_desktop', 'pet_cards', 'category_cards', 'og_image'].forEach(c => {
    if (!allContexts.includes(c)) allContexts.push(c);
  });

  const [aiCredits, setAiCredits] = useState<number>(0);
  const [creditsInput, setCreditsInput] = useState<string>('');
  const [savingCredits, setSavingCredits] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadWebhook();
    loadSiteSettings();
    loadAdminSettings();
    loadOwnerUsers();
    loadAiBlocks();
    loadAiCredits();
  }, []);

  const loadContextModel = async (ctx: string) => {
    setLoadingContextModel(true);
    try {
      const { data } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model, credits_per_use')
        .eq('context', ctx)
        .maybeSingle();
      setContextAiModel(data?.ai_model ?? 'gpt-image-1.5');
      setContextCredits(data?.credits_per_use ?? 1);
    } finally {
      setLoadingContextModel(false);
    }
  };

  const handleChangeContextModel = async (newModel: string) => {
    setContextAiModel(newModel);
    await supabase.from('ai_image_context_settings').upsert({
      context: selectedContext,
      ai_model: newModel,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'context' });
  };

  const handleChangeContextCredits = async (newCredits: number) => {
    const safeValue = Math.max(0, Math.floor(newCredits) || 0);
    setContextCredits(safeValue);
    await supabase.from('ai_image_context_settings').upsert({
      context: selectedContext,
      credits_per_use: safeValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'context' });
  };

  useEffect(() => {
    if (activeSection === 'image-ai') {
      loadContextModel(selectedContext);
    }
  }, [selectedContext, activeSection]);

  const loadAiBlocks = async () => {
    setLoadingAiBlocks(true);
    try {
      const { data } = await supabase
        .from('ai_image_config')
        .select('*')
        .order('sort_order', { ascending: true });
      setAiPromptBlocks(data || []);
    } catch {} finally { setLoadingAiBlocks(false); }
  };

  const handleToggleAiBlock = async (block: AiPromptBlock) => {
    try {
      await supabase
        .from('ai_image_config')
        .update({ active: !block.active, updated_at: new Date().toISOString() })
        .eq('id', block.id);
      setAiPromptBlocks(prev =>
        prev.map(b => b.id === block.id ? { ...b, active: !b.active } : b)
      );
      showToast(block.active ? 'Bloque desactivado' : 'Bloque activado');
    } catch { showToast('Error al actualizar', false); }
  };

  const handleSaveAiBlock = async () => {
    if (!aiBlockForm.name.trim() || !aiBlockForm.prompt_block.trim()) {
      showToast('Completá nombre y prompt', false); return;
    }
    setSavingAiBlock(true);
    try {
      if (editingAiBlock) {
        await supabase.from('ai_image_config').update({
          name: aiBlockForm.name.trim(),
          prompt_block: aiBlockForm.prompt_block.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', editingAiBlock.id);
        showToast('Bloque actualizado');
      } else {
        const maxOrder = aiPromptBlocks.length > 0
          ? Math.max(...aiPromptBlocks.map(b => b.sort_order)) + 1 : 0;
        await supabase.from('ai_image_config').insert([{
          name: aiBlockForm.name.trim(),
          prompt_block: aiBlockForm.prompt_block.trim(),
          context: selectedContext,
          active: false,
          sort_order: maxOrder,
        }]);
        showToast('Bloque creado');
      }
      setAiBlockForm({ name: '', prompt_block: '' });
      setEditingAiBlock(null);
      await loadAiBlocks();
    } catch { showToast('Error al guardar', false); }
    finally { setSavingAiBlock(false); }
  };

  const handleDeleteAiBlock = async (id: string) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    try {
      await supabase.from('ai_image_config').delete().eq('id', id);
      setAiPromptBlocks(prev => prev.filter(b => b.id !== id));
      showToast('Bloque eliminado');
    } catch { showToast('Error al eliminar', false); }
  };

  const loadAiCredits = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'ai_image_credits')
        .maybeSingle();
      const val = parseInt(data?.value || '0', 10);
      setAiCredits(isNaN(val) ? 0 : val);
      setCreditsInput(isNaN(val) ? '0' : String(val));
    } catch {}
  };

  const handleSaveCredits = async (newValue: number) => {
    if (isNaN(newValue) || newValue < 0) {
      showToast('Valor inválido', false); return;
    }
    setSavingCredits(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ value: String(newValue), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      if (error) throw error;
      setAiCredits(newValue);
      setCreditsInput(String(newValue));
      showToast(`Créditos actualizados: ${newValue}`);
    } catch { showToast('Error al guardar créditos', false); }
    finally { setSavingCredits(false); }
  };

  const loadWebhook = async () => {
    try {
      const { data } = await supabase.from('settings').select('value').eq('key', 'chat_webhook_url').maybeSingle();
      setWebhookUrl(data?.value || '');
    } catch {}
    finally { setLoadingWebhook(false); }
  };

  const loadSiteSettings = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('logo_url').single();
      if (data?.logo_url) setLogoUrl(data.logo_url);
    } catch {}
  };

  const loadAdminSettings = async () => {
    try {
      const { data } = await supabase.from('admin_settings').select('*').single();
      if (data) setAdminSettings(prev => ({ ...prev, ...data }));
    } catch {}
  };

  const loadOwnerUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabaseAuth
        .from('user_profiles')
        .select('id, email, full_name, phone, role, active, created_at')
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOwnerUsers(data || []);
    } catch (e) { console.error('Error loading users:', e); }
    finally { setLoadingUsers(false); }
  };

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').update({ value: webhookUrl, updated_at: new Date().toISOString() }).eq('key', 'chat_webhook_url');
      if (error) throw error;
      showToast('Webhook actualizado');
    } catch { showToast('Error al guardar', false); }
    finally { setSaving(false); }
  };

  const handleSaveAdminSettings = async () => {
    setSaving(true);
    try {
      const updateData = {
        chat_enabled: adminSettings.chat_enabled,
        footer_credit_image_url: adminSettings.footer_credit_image_url,
        footer_credit_uploaded_image: adminSettings.footer_credit_uploaded_image,
        owner_login_bg_color: adminSettings.owner_login_bg_color,
        owner_login_title: adminSettings.owner_login_title,
        owner_login_subtitle: adminSettings.owner_login_subtitle,
        owner_login_logo_url: adminSettings.owner_login_logo_url,
        use_native_webp: adminSettings.use_native_webp,
        use_native_categorization: adminSettings.use_native_categorization,
        native_ai_model: adminSettings.native_ai_model,
        seo_ai_model: adminSettings.seo_ai_model || 'gpt-4o-mini',
        updated_at: new Date().toISOString()
      };
      
      assertNoBase64(updateData);

      const { error } = await supabase.from('admin_settings').update(updateData).eq('id', '00000000-0000-0000-0000-000000000002');
      if (error) throw error;
      showToast('Configuración guardada');
    } catch (err: any) { 
      showToast(err.message || 'Error al guardar', false); 
    }
    finally { setSaving(false); }
  };

  const handleFooterImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Archivo no válido', false); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Máximo 5MB', false); return; }
    
    try {
      const url = await uploadImageToStorage(file, 'site-assets');
      setAdminSettings(prev => ({ ...prev, footer_credit_uploaded_image: url }));
      showToast('Imagen de footer subida con éxito');
    } catch (error: any) {
      showToast('Error al subir imagen: ' + error.message, false);
    }
  };

  const handleToggleUserActive = async (userId: string, current: boolean) => {
    try {
      const { error } = await supabaseAuth.from('user_profiles').update({ active: !current }).eq('id', userId);
      if (error) throw error;
      showToast(current ? 'Usuario desactivado' : 'Usuario activado');
      await loadOwnerUsers();
    } catch { showToast('Error al actualizar', false); }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar el usuario ${email}? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabaseAuth.from('user_profiles').delete().eq('id', userId);
      if (error) throw error;
      showToast('Perfil eliminado. Eliminá el acceso en Supabase → Authentication → Users.');
      await loadOwnerUsers();
    } catch { showToast('Error al eliminar', false); }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      showToast('Email, contraseña y nombre son obligatorios', false);
      return;
    }
    setCreatingUser(true);
    try {
      const response = await fetch('/api/admin/create-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al crear usuario');
      showToast(`Usuario creado: ${newUser.email}`);
      setNewUser({ email: '', password: '', full_name: '', phone: '' });
      setShowCreateUser(false);
      await loadOwnerUsers();
    } catch (error: any) {
      showToast('Error: ' + (error.message || 'Desconocido'), false);
    } finally { setCreatingUser(false); }
  };

  const openEditUser = (user: OwnerUser) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name, phone: user.phone || '', password: '' });
    setShowEditPassword(false);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabaseAuth.from('user_profiles').update({
        full_name: editForm.full_name,
        phone: editForm.phone,
        updated_at: new Date().toISOString(),
      }).eq('id', editingUser.id);
      if (error) throw error;
      if (editForm.password) {
        const res = await fetch('/api/admin/create-owner', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingUser.id, password: editForm.password }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
      }
      showToast('Usuario actualizado');
      setEditingUser(null);
      await loadOwnerUsers();
    } catch (error: any) {
      showToast('Error: ' + (error.message || 'Desconocido'), false);
    } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await supabaseAuth.auth.signOut();
    window.location.href = '/admin/login';
  };

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={18} /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={18} /> },
    { id: 'apariencia', label: 'Apariencia', icon: <Palette size={18} /> },
    { id: 'sistema', label: 'Sistema', icon: <Settings size={18} /> },
    { id: 'image-ai', label: 'Image AI Config', icon: <ImageIcon size={18} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans text-gray-900 bg-gray-100">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Mobile header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50">
        <h1 className="text-lg font-bold">Panel Admin</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 md:relative md:translate-x-0
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'w-14' : 'w-56'}
        bg-slate-900 text-slate-300 flex-shrink-0 h-screen flex flex-col
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <img src={logoUrl} alt="logo" className="h-7 w-auto object-contain flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Panel Admin</p>
                <p className="text-[10px] text-slate-500">Administración</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto flex-shrink-0"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setIsMobileMenuOpen(false); }}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center px-2 py-2.5 rounded-lg transition-colors text-sm font-medium
                ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}
                ${activeSection === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
            >
              {item.icon}
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <a href="/owner" title={isSidebarCollapsed ? 'Panel Owner' : undefined}
            className={`w-full flex items-center px-2 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <Settings size={18} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span>Panel Owner</span>}
          </a>
          <button onClick={handleLogout} title={isSidebarCollapsed ? 'Cerrar Sesión' : undefined}
            className={`w-full flex items-center px-2 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <LogOut size={18} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-screen overflow-y-auto bg-gray-100">
        <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">

          {/* USUARIOS */}
          {activeSection === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
                  <p className="text-gray-500 text-sm">Gestión de accesos al panel</p>
                </div>
                <button onClick={() => setShowCreateUser(!showCreateUser)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                  {showCreateUser ? <X size={14} /> : <Users size={14} />}
                  {showCreateUser ? 'Cancelar' : 'Nuevo Owner'}
                </button>
              </div>

              {showCreateUser && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Crear usuario owner</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Nombre *', key: 'full_name', type: 'text', placeholder: 'Juan Pérez' },
                      { label: 'Teléfono', key: 'phone', type: 'text', placeholder: '+595 981 000000' },
                      { label: 'Email *', key: 'email', type: 'email', placeholder: 'owner@ejemplo.com' },
                      { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input type={f.type} value={(newUser as any)[f.key]} onChange={e => setNewUser({ ...newUser, [f.key]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleCreateUser} disabled={creatingUser}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    {creatingUser ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loadingUsers ? (
                  <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : ownerUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">No hay usuarios registrados</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ownerUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {(user.full_name || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{user.active ? 'Activo' : 'Inactivo'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditUser(user)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium">Editar</button>
                              <button onClick={() => handleToggleUserActive(user.id, user.active)}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${user.active ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}>
                                {user.active ? 'Desactivar' : 'Activar'}
                              </button>
                              {user.role !== 'admin' && (
                                <button onClick={() => handleDeleteUser(user.id, user.email)} className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium">Eliminar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* WEBHOOKS */}
          {activeSection === 'webhooks' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
                <p className="text-gray-500 text-sm">Integraciones externas del sistema</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL del Webhook de Chat (n8n)</label>
                  {loadingWebhook ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ) : (
                    <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://example.app.n8n.cloud/webhook/..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  )}
                  <p className="text-xs text-gray-400 mt-2">Conecta el chat del sitio con el workflow de n8n para respuestas con IA.</p>
                </div>
                {webhookUrl && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1 font-medium">URL actual:</p>
                    <code className="text-xs text-blue-600 break-all">{webhookUrl}</code>
                  </div>
                )}
                <button onClick={handleSaveWebhook} disabled={saving || !webhookUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* APARIENCIA */}
          {activeSection === 'apariencia' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Apariencia</h1>
                <p className="text-gray-500 text-sm">Login de owner y crédito del footer</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Panel izquierdo del Login Owner</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Color de fondo</label>
                    <div className="flex gap-2">
                      <input type="color" value={adminSettings.owner_login_bg_color}
                        onChange={e => setAdminSettings(prev => ({ ...prev, owner_login_bg_color: e.target.value }))}
                        className="h-9 w-12 border border-gray-300 rounded cursor-pointer" />
                      <input type="text" value={adminSettings.owner_login_bg_color}
                        onChange={e => setAdminSettings(prev => ({ ...prev, owner_login_bg_color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">URL del logo</label>
                    <input type="text" value={adminSettings.owner_login_logo_url}
                      onChange={e => setAdminSettings(prev => ({ ...prev, owner_login_logo_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="https://... (vacío = ícono)" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-2">Título</label>
                    <input type="text" value={adminSettings.owner_login_title}
                      onChange={e => setAdminSettings(prev => ({ ...prev, owner_login_title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-2">Subtítulo</label>
                    <input type="text" value={adminSettings.owner_login_subtitle}
                      onChange={e => setAdminSettings(prev => ({ ...prev, owner_login_subtitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden h-28 flex items-center justify-center border border-gray-200"
                  style={{ backgroundColor: adminSettings.owner_login_bg_color }}>
                  <div className="text-center text-white px-4">
                    {adminSettings.owner_login_logo_url && <img src={adminSettings.owner_login_logo_url} alt="logo" className="h-8 mx-auto mb-2 object-contain" />}
                    <p className="font-black text-sm uppercase tracking-tight">{adminSettings.owner_login_title}</p>
                    <p className="text-white/60 text-xs mt-1">{adminSettings.owner_login_subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Crédito del Footer</h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">URL de imagen</label>
                  <input type="text" value={adminSettings.footer_credit_image_url}
                    onChange={e => setAdminSettings(prev => ({ ...prev, footer_credit_image_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">O subir desde PC</label>
                  <input type="file" accept="image/*" onChange={handleFooterImageUpload}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                </div>
                {(adminSettings.footer_credit_uploaded_image || adminSettings.footer_credit_image_url) && (
                  <img src={adminSettings.footer_credit_uploaded_image || adminSettings.footer_credit_image_url}
                    alt="preview" className="h-8 object-contain rounded border border-gray-200 p-1.5 bg-gray-50" />
                )}
              </div>

              <button onClick={handleSaveAdminSettings} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-40">
                <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Apariencia'}
              </button>
            </div>
          )}

          {/* SISTEMA */}
          {activeSection === 'sistema' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sistema</h1>
                <p className="text-gray-500 text-sm">Configuración general del sitio</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Widget de Chat</p>
                    <p className="text-xs text-gray-400 mt-0.5">Activa o desactiva el chat flotante del sitio</p>
                  </div>
                  <button onClick={() => setAdminSettings(prev => ({ ...prev, chat_enabled: !prev.chat_enabled }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${adminSettings.chat_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${adminSettings.chat_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Procesamiento de IA */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Procesamiento de IA</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cambia entre n8n (externo) y procesamiento nativo (Next.js). 
                      Habilitá solo cuando hayas verificado que el modo nativo funciona correctamente.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">WebP nativo (sharp)</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {adminSettings.use_native_webp 
                          ? '✅ Usando sharp nativo — n8n desconectado para imágenes'
                          : '⚙️ Usando webhook n8n para conversión de imágenes'}
                      </p>
                    </div>
                    <button
                      onClick={() => setAdminSettings(prev => ({ ...prev, use_native_webp: !prev.use_native_webp }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${adminSettings.use_native_webp ? 'bg-teal-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${adminSettings.use_native_webp ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Categorización nativa (OpenAI)</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {adminSettings.use_native_categorization 
                          ? `✅ Usando OpenAI ${adminSettings.native_ai_model || 'gpt-4o-mini'} nativo — n8n desconectado para categorización`
                          : '⚙️ Usando workflow n8n para categorización con IA'}
                      </p>
                    </div>
                    <button
                      onClick={() => setAdminSettings(prev => ({ ...prev, use_native_categorization: !prev.use_native_categorization }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${adminSettings.use_native_categorization ? 'bg-teal-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${adminSettings.use_native_categorization ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {adminSettings.use_native_categorization && (
                    <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-teal-500 bg-teal-50/50 rounded-r-lg">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Modelo OpenAI para Categorización</p>
                        <p className="text-[10px] text-gray-400">Seleccioná qué modelo usar para la categorización nativa.</p>
                      </div>
                      <select
                        value={adminSettings.native_ai_model || 'gpt-4o-mini'}
                        onChange={e => setAdminSettings(prev => ({ ...prev, native_ai_model: e.target.value }))}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none font-medium"
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-[#1A8A00] bg-emerald-50/40 rounded-r-lg">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Modelo de IA — Generación SEO</p>
                      <p className="text-[10px] text-gray-400">Seleccioná qué modelo usar para la generación SEO nativa.</p>
                    </div>
                    <select
                      value={adminSettings.seo_ai_model || 'gpt-4o-mini'}
                      onChange={e => setAdminSettings(prev => ({ ...prev, seo_ai_model: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#1A8A00] focus:border-transparent outline-none font-medium"
                    >
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                      <option value="gpt-4.1">gpt-4.1</option>
                      <option value="o4-mini">o4-mini</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      💡 Para probar el modo nativo antes de activarlo, usá la herramienta de debug en el panel owner: 
                      <strong>/owner/debug-procesamiento</strong>
                    </p>
                  </div>
                </div>

                <button onClick={handleSaveAdminSettings} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-40">
                  <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Advertencia de Seguridad</p>
                <p className="text-xs text-amber-600">Este panel es exclusivo para administradores. Los cambios afectan toda la aplicación.</p>
              </div>
            </div>
          )}

          {activeSection === 'image-ai' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Image AI Config</h1>
                <p className="text-gray-500 text-sm">Configurá los bloques de prompt que se usan al mejorar imágenes con IA en productos.</p>
              </div>

              {/* Créditos de mejoras con IA */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Créditos de mejoras con IA</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cada uso del botón "Mejorar con IA" descuenta 1 crédito.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-600">{aiCredits}</p>
                    <p className="text-xs text-gray-400">disponibles</p>
                  </div>
                </div>

                {/* Agregar rápido */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Agregar créditos rápido:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[10, 50, 100, 200, 500].map(amount => (
                      <button
                        key={amount}
                        onClick={() => handleSaveCredits(aiCredits + amount)}
                        disabled={savingCredits}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                      >
                        +{amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Establecer valor exacto */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Establecer valor exacto:</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={creditsInput}
                      onChange={e => setCreditsInput(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="0"
                    />
                    <button
                      onClick={() => handleSaveCredits(parseInt(creditsInput, 10))}
                      disabled={savingCredits}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      <Save size={14} />
                      {savingCredits ? 'Guardando...' : 'Establecer'}
                    </button>
                    <button
                      onClick={() => handleSaveCredits(0)}
                      disabled={savingCredits}
                      className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                    >
                      Resetear a 0
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview del prompt activo */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Prompt final que se enviará al modelo ({contextLabel(selectedContext)})</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 font-mono min-h-[60px]">
                  {aiPromptBlocks.filter(b => b.active && (b.context || 'products') === selectedContext).length === 0
                    ? <span className="text-gray-400 italic">Ningún bloque activo en este contexto. Activá al menos uno.</span>
                    : aiPromptBlocks.filter(b => b.active && (b.context || 'products') === selectedContext).map(b => b.prompt_block).join('. ')
                  }
                </div>
              </div>

              {/* Formulario nuevo/editar */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  {editingAiBlock ? 'Editar bloque' : `Nuevo bloque de prompt en contexto "${contextLabel(selectedContext)}"`}
                </h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={aiBlockForm.name}
                    onChange={e => setAiBlockForm({ ...aiBlockForm, name: e.target.value })}
                    placeholder="Ej: E-commerce básico"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prompt</label>
                  <textarea
                    rows={3}
                    value={aiBlockForm.prompt_block}
                    onChange={e => setAiBlockForm({ ...aiBlockForm, prompt_block: e.target.value })}
                    placeholder="Professional e-commerce product photo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAiBlock}
                    disabled={savingAiBlock}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={14} />
                    {savingAiBlock ? 'Guardando...' : editingAiBlock ? 'Actualizar' : 'Agregar bloque'}
                  </button>
                  {editingAiBlock && (
                    <button
                      onClick={() => { setEditingAiBlock(null); setAiBlockForm({ name: '', prompt_block: '' }); }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de bloques */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold text-gray-700">Bloques registrados</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Contexto:</span>
                    {allContexts.map(ctx => (
                      <button
                        key={ctx}
                        onClick={() => setSelectedContext(ctx)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          selectedContext === ctx 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {contextLabel(ctx)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de modelo de IA por contexto */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Modelo de IA para "{contextLabel(selectedContext)}"
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Define qué modelo de OpenAI se usa al mejorar imágenes en este contexto 
                      específico. El usuario owner no puede modificar esto.
                    </p>
                  </div>
                  <select
                    value={contextAiModel}
                    onChange={e => handleChangeContextModel(e.target.value)}
                    disabled={loadingContextModel}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                  >
                    <option value="gpt-image-1.5">gpt-image-1.5 — calidad superior, más costoso</option>
                    <option value="gpt-image-1-mini">gpt-image-1-mini — más económico</option>
                    {(selectedContext === 'hero_desktop' || selectedContext === 'pet_cards') && (
                      <option value="gpt-image-2">gpt-image-2 — único que soporta 3:1 real</option>
                    )}
                  </select>

                  <div className="pt-3 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Créditos por uso para "{contextLabel(selectedContext)}"
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 mb-2">
                      Cuántos créditos se descuentan del pool compartido cada vez que se usa 
                      "Mejorar con IA" en este contexto.
                      {selectedContext === 'hero_desktop' && (
                        ' Este costo aplica tanto a la mejora de Desktop como a la generación de la versión Mobile (que no tiene modelo propio configurable).'
                      )}
                    </p>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={contextCredits}
                      onChange={e => handleChangeContextCredits(Number(e.target.value))}
                      disabled={loadingContextModel}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        Imágenes de referencia
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Permite configurar y cargar imágenes de referencia de estilo para este contexto.
                      </p>
                    </div>
                    <button
                      onClick={() => setRefImagesModalOpen(true)}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold border border-blue-200 transition-colors whitespace-nowrap"
                    >
                      🖼️ Imágenes de referencia — {contextLabel(selectedContext)}
                    </button>
                  </div>
                </div>

                {loadingAiBlocks ? (
                  <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
                ) : aiPromptBlocks.filter(b => (b.context || 'products') === selectedContext).length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No hay bloques en este contexto. Creá uno arriba.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {aiPromptBlocks.filter(b => (b.context || 'products') === selectedContext).map(block => (
                      <div key={block.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => handleToggleAiBlock(block)}
                          className={`mt-0.5 w-10 h-5 rounded-full flex-shrink-0 transition-colors relative ${block.active ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${block.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{block.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{block.prompt_block}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingAiBlock(block); setAiBlockForm({ name: block.name, prompt_block: block.prompt_block }); }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAiBlock(block.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal editar usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email (no editable)</label>
                <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">{editingUser.email}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nueva contraseña (vacío = sin cambio)</label>
                <div className="relative">
                  <input type={showEditPassword ? 'text' : 'password'} value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                    placeholder="Nueva contraseña..." />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={handleSaveEditUser} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {refImagesModalOpen && (
        <AIPromptConfigModal
          open={refImagesModalOpen}
          onClose={() => setRefImagesModalOpen(false)}
          context={selectedContext}
          contextLabel={contextLabel(selectedContext)}
        />
      )}

    </div>
  );
}
