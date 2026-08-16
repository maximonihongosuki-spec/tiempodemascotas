import Link from 'next/link';
import { Package, ShoppingBag, Star, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import { getMemberSession } from '../../../src/lib/memberSession';

export const dynamic = 'force-dynamic';

export default async function MiembrosDashboardPage() {
  const session = await getMemberSession();
  const profile = session!.profile; // el layout ya garantiza que existe

  const firstName = profile.full_name?.split(' ')[0] || 'Miembro';

  const stats = [
    { label: 'Total puntos', value: (profile.points || 0).toLocaleString('es-PY'), icon: Star, accent: true },
    { label: 'Nivel actual', value: 'Veterinario', icon: TrendingUp, accent: false },
    { label: 'Estado', value: 'Activo', icon: CheckCircle, accent: false },
  ];

  const quickLinks = [
    {
      href: '/miembros/catalogo',
      label: 'Ver Catálogo',
      desc: profile.role === 'mayorista' ? 'Productos con precios exclusivos' : 'Explorá y comprá desde tu cuenta',
      icon: Package
    },
    { href: '/miembros/pedidos', label: 'Mis Pedidos', desc: 'Seguí tus pedidos en tiempo real', icon: ShoppingBag },
    { href: '/miembros/puntos', label: 'Mis Puntos', desc: `${profile.points || 0} puntos acumulados`, icon: Star },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">¡Hola, {firstName}!</h1>
        <p className="text-gray-400 text-sm mt-0.5">Aquí tenés un resumen de tu cuenta</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-black mt-1 ${s.accent ? 'text-[#166534]' : 'text-gray-800'}`}>{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.accent ? 'bg-[#eeee22]' : 'bg-gray-50'}`}>
              <s.icon className={`w-5 h-5 ${s.accent ? 'text-[#166534]' : 'text-gray-400'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Accesos rápidos</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-[#166534]/20 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-[#166534]/8 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#166534] transition-colors">
                <link.icon className="w-5 h-5 text-[#166534] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm">{link.label}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{link.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-[#166534] text-xs font-semibold">
                Ir <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">Mis datos</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Nombre', value: profile.full_name || '—' },
            { label: 'Email', value: profile.email || '—' },
            { label: 'Teléfono', value: profile.phone || '—' },
            { label: 'Miembro desde', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-PY', { year: 'numeric', month: 'long' }) : '—' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
