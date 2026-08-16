'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '../../../src/lib/supabase-auth';
import { Lock, Mail, PawPrint } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) { setError('Credenciales incorrectas'); setLoading(false); return; }
      const { data: profile } = await supabaseAuth.from('user_profiles').select('role, active').eq('id', data.user.id).single();
      if (!profile || !profile.active || profile.role !== 'admin') {
        await supabaseAuth.auth.signOut();
        setError('No tenés permisos de administrador');
        setLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch { setError('Error al iniciar sesión'); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden md:flex md:w-1/2 bg-[#166534] flex-col items-center justify-center p-12 text-white">
        <div className="w-20 h-20 bg-[#eeee22] rounded-2xl flex items-center justify-center mb-8 shadow-xl">
          <PawPrint className="w-10 h-10 text-[#166534]" />
        </div>
        <h1 className="text-4xl font-display font-black uppercase tracking-tight text-center mb-4">
          Tiempo de Mascotas
        </h1>
        <p className="text-white/70 text-center text-lg font-display max-w-xs">
          Panel de Administración — Acceso exclusivo para administradores del sistema.
        </p>
        <div className="mt-12 flex gap-3">
          <div className="w-2 h-2 rounded-full bg-[#eeee22]" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <div className="w-2 h-2 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2 md:hidden">
              <PawPrint className="w-8 h-8 text-[#166534]" />
            </div>
            <h2 className="text-3xl font-display font-black text-[#166534] uppercase tracking-tight">
              Panel Admin
            </h2>
            <p className="text-gray-500 mt-1 font-display">Ingresá tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@tiempodemascotas.com.py"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] focus:ring-0 outline-none transition-colors font-medium" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] focus:ring-0 outline-none transition-colors font-medium" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-display font-black uppercase tracking-wider hover:bg-[#064E3B] transition-colors disabled:opacity-50 shadow-lg">
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>

            <div className="text-center">
              <a href="/" className="text-sm text-gray-400 hover:text-[#166534] transition-colors font-medium">
                ← Volver al sitio
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
