'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PawPrint, User, Mail, Lock, Phone, CreditCard, ChevronDown } from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

type DocumentType = 'ci' | 'ruc_personal' | 'ruc_sociedad';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ci: 'Cédula de identidad (CI)',
  ruc_personal: 'RUC — Persona física / Unipersonal',
  ruc_sociedad: 'RUC — Sociedad / Empresa',
};

export default function RegistroPage() {
  type AccountType = 'cliente' | 'veterinario' | 'estudiante_veterinario';
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    document: '',
    document_type: 'ci' as DocumentType,
    account_type: 'cliente' as AccountType,
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isMayoristaResult, setIsMayoristaResult] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (form.account_type !== 'cliente' && !licenseFile) {
      setError('Por favor subí una foto de tu licencia o carnet');
      return;
    }

    setLoading(true);
    try {
      let professional_document_url: string | null = null;
      if (licenseFile) {
        setUploadingLicense(true);
        try {
          const ext = licenseFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `${Date.now()}_${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('membership-docs')
            .upload(filename, licenseFile, { contentType: licenseFile.type, upsert: false });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('membership-docs').getPublicUrl(filename);
          professional_document_url = publicUrl;
        } catch (e: any) {
          setError('Error al subir la imagen: ' + (e?.message || 'intenta de nuevo'));
          setUploadingLicense(false);
          setLoading(false);
          return;
        }
        setUploadingLicense(false);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone,
          document: form.document,
          document_type: form.document_type,
          account_type: form.account_type,
          professional_document_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');
      setIsMayoristaResult(data.pending_approval);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#eeee22] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8 text-[#166534]" />
          </div>
          {isMayoristaResult ? (
            <>
              <h1 className="text-2xl font-display font-black text-[#166534] uppercase mb-2">¡Solicitud enviada!</h1>
              <p className="text-gray-600 mb-1">Tu solicitud de cuenta de <strong>veterinario</strong> fue recibida.</p>
              <p className="text-gray-500 text-sm mb-6">Revisá tu email — te avisaremos cuando tu cuenta sea aprobada.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-black text-[#166534] uppercase mb-2">¡Cuenta creada!</h1>
              <p className="text-gray-600 mb-6">Ya podés iniciar sesión con tu cuenta.</p>
            </>
          )}
          <Link href="/miembros/login"
            className="inline-block w-full py-3 bg-[#166534] text-white rounded-xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo verde */}
      <div className="hidden md:flex md:w-5/12 bg-[#166534] flex-col items-center justify-center p-12 text-white">
        <div className="w-20 h-20 bg-[#eeee22] rounded-2xl flex items-center justify-center mb-8 shadow-xl">
          <PawPrint className="w-10 h-10 text-[#166534]" />
        </div>
        <h1 className="text-3xl font-display font-black uppercase tracking-tight text-center mb-4">
          Tiempo de Mascotas
        </h1>
        <p className="text-white/70 text-center font-display max-w-xs">
          Creá tu cuenta y accedé a beneficios exclusivos para nuestros clientes.
        </p>
        <div className="mt-8 space-y-3 w-full max-w-xs">
          {['Seguimiento de tus pedidos', 'Historial de compras', 'Acceso a precios de veterinario (sujeto a aprobación)'].map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-[#eeee22] flex-shrink-0" />
              <span className="text-sm font-display font-bold">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-white/50 text-sm">
          ¿Ya tenés cuenta?{' '}
          <Link href="/miembros/login" className="text-[#eeee22] font-bold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-3xl font-display font-black text-[#166534] uppercase tracking-tight">Crear cuenta</h2>
            <p className="text-gray-500 mt-1 font-display text-sm">Completá tus datos para registrarte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nombre completo *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" required value={form.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" required value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
              </div>
            </div>

            {/* Contraseña */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Contraseña *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" required value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Confirmar *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" required value={form.confirm_password}
                    onChange={e => handleChange('confirm_password', e.target.value)}
                    placeholder="Repetir contraseña"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
                </div>
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Teléfono / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="0981 234 567"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
              </div>
            </div>

            {/* Tipo de documento */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tipo de documento</label>
              <div className="relative">
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select value={form.document_type}
                  onChange={e => handleChange('document_type', e.target.value as DocumentType)}
                  className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none appearance-none bg-white">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Número de documento */}
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                {form.document_type === 'ci' ? 'Número de cédula' : 'RUC (con dígito verificador)'}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={form.document}
                  onChange={e => handleChange('document', e.target.value)}
                  placeholder={form.document_type === 'ci' ? 'Ej: 3230069' : 'Ej: 3230069-5'}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors" />
              </div>
              {form.document_type === 'ruc_personal' && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Para unipersonales el RUC es tu CI + dígito verificador. Ej: si tu CI es 3230069, tu RUC es 3230069-5
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tipo de cuenta *</label>
              <select
                value={form.account_type}
                onChange={e => handleChange('account_type', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] outline-none transition-colors bg-white font-bold"
              >
                <option value="cliente">Cliente — acceso inmediato</option>
                <option value="veterinario">Veterinario — requiere aprobación</option>
                <option value="estudiante_veterinario">Estudiante de veterinaria — requiere aprobación</option>
              </select>
              {form.account_type !== 'cliente' && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Las cuentas profesionales requieren aprobación manual. Te avisaremos por email cuando tu cuenta sea activada.
                </p>
              )}
            </div>

            {/* Upload de licencia / carnet */}
            {form.account_type !== 'cliente' && (
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  {form.account_type === 'veterinario' ? 'Foto de licencia profesional *' : 'Foto de carnet de estudiante *'}
                </label>
                {!licenseFile ? (
                  <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingLicense ? 'border-gray-200' : 'border-[#166534]/40 bg-[#166534]/5 hover:bg-[#166534]/10'}`}>
                    <input type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => e.target.files?.[0] && setLicenseFile(e.target.files[0])} />
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#166534]">Tocá para subir la imagen</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">JPG · PNG · PDF</p>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 text-lg">✓</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-green-800">Archivo listo</p>
                      <p className="text-[10px] text-gray-500 truncate">{licenseFile.name}</p>
                    </div>
                    <button type="button" onClick={() => setLicenseFile(null)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-display font-black uppercase tracking-wider hover:bg-[#064E3B] transition-colors disabled:opacity-50 shadow-lg">
              {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
            </button>

            <p className="text-center text-sm text-gray-500">
              ¿Ya tenés cuenta?{' '}
              <Link href="/miembros/login" className="text-[#166534] font-bold hover:underline">
                Iniciá sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
