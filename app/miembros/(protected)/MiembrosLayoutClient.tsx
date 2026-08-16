'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseAuth } from '../../../src/lib/supabase-auth';
import { LayoutDashboard, Package, ShoppingBag, Star, LogOut, Menu, X, PawPrint } from 'lucide-react';
import type { MemberProfile } from '../../../src/lib/memberSession';

type Props = {
  profile: MemberProfile;
  logoUrl: string;
  children: React.ReactNode;
};

export default function MiembrosLayoutClient({ profile, logoUrl, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseAuth.auth.signOut();
    router.push('/miembros/login');
  };

  const navLinks = [
    { href: '/miembros', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/miembros/catalogo', label: 'Catálogo', icon: Package },
    { href: '/miembros/pedidos', label: 'Mis Pedidos', icon: ShoppingBag },
    { href: '/miembros/puntos', label: 'Puntos', icon: Star },
  ];

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link href="/miembros" className="flex flex-col items-start gap-1.5">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain max-w-full" />
            <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">Área de Miembros</p>
          </Link>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eeee22] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#166534]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{profile.full_name || 'Miembro'}</p>
              <p className="text-[10px] text-gray-400 truncate">{profile.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-black text-[#166534] bg-[#166534]/10 px-2 py-0.5 rounded-full uppercase">
              {profile.role === 'mayorista' ? 'Veterinario' : 'Cliente'}
            </span>
            <span className="text-[10px] font-bold text-[#eeee22] bg-[#166534] px-2 py-0.5 rounded-full">{profile.points || 0} pts</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#166534] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <link.icon className="w-4 h-4 flex-shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-colors">
            <PawPrint className="w-4 h-4" />
            Ver sitio
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="hidden md:block">
            <p className="text-xs text-gray-400 font-semibold">
              {navLinks.find(l => l.href === pathname)?.label || 'Área de Miembros'}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 bg-[#166534]/5 rounded-xl px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-[#166534]" />
              <span className="text-xs font-black text-[#166534]">{profile.points || 0} puntos</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#eeee22] flex items-center justify-center text-xs font-black text-[#166534]">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
