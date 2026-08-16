'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ShoppingBag, LogOut, MessageSquare, Settings, Brain, DollarSign, CreditCard, FileText, MapPin, Globe, Menu, LayoutTemplate, Download, ChevronLeft, ChevronRight, Users, Layers, Zap, Archive } from 'lucide-react';
import { supabaseAuth } from '../../src/lib/supabase-auth';
import { supabase } from '../../src/lib/supabase';
import MetadataUpdater from '../../src/components/MetadataUpdater';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [needsBoxSync, setNeedsBoxSync] = useState(false);

  useEffect(() => {
    const checkBoxSync = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'box_presentations_last_synced_at')
        .maybeSingle();

      const now = new Date();
      const cutoffToday = new Date(now);
      cutoffToday.setHours(7, 0, 0, 0);

      const lastSynced = data?.value ? new Date(data.value) : null;
      const needsSync = now >= cutoffToday && (!lastSynced || lastSynced < cutoffToday);
      setNeedsBoxSync(needsSync);
    };
    checkBoxSync();
    const interval = setInterval(checkBoxSync, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Si estamos en la ruta de login, mostrar solo el contenido sin sidebar
  if (pathname === '/owner/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await supabaseAuth.auth.signOut();
    router.push('/owner/login');
  };

  const tabs = [
    { id: 'productos', label: 'Productos', icon: Package, path: '/owner/productos' },
    { id: 'categorias', label: 'Categorías', icon: Globe, path: '/owner/categorias' },
    { id: 'categorizar', label: 'Categorizar con IA', icon: Brain, path: '/owner/categorizar-productos' },
    { id: 'logs', label: 'Logs de Procesamiento', icon: FileText, path: '/owner/procesamiento-logs' },
    { id: 'importar', label: 'Importar Productos', icon: Download, path: '/owner/importar-productos' },
    { id: 'productos-sistema', label: 'Productos Sistema', icon: Archive, path: '/owner/productos-sistema' },
    { id: 'presentacion-cajas', label: 'Presentación Cajas', icon: Package, path: '/owner/presentacion-cajas' },
    { id: 'convertir-webp', label: 'Convertidor WebP', icon: Zap, path: '/owner/convertir-webp' },
    { id: 'locales', label: 'Locales', icon: MapPin, path: '/owner/locales' },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, path: '/owner/pedidos' },
    { id: 'clientes', label: 'Clientes', icon: Users, path: '/owner/clientes' },
    { id: 'ventas', label: 'Ventas', icon: DollarSign, path: '/owner/ventas' },
    { id: 'creditos', label: 'Créditos', icon: CreditCard, path: '/owner/creditos' },
    { id: 'facturacion', label: 'Facturación', icon: FileText, path: '/owner/facturacion' },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare, path: '/owner/mensajes' },
    { id: 'chats', label: 'Chats IA', icon: MessageSquare, path: '/owner/chats' },
    { id: 'reviews', label: 'Reseñas', icon: MessageSquare, path: '/owner/reviews' },
    { id: 'seo', label: 'SEO y Metadatos', icon: Globe, path: '/owner/seo' },
    { id: 'ai', label: 'Instrucciones IA', icon: Brain, path: '/owner/ai' },
    { id: 'contenidos', label: 'Contenidos Home', icon: LayoutTemplate, path: '/owner/contenidos/home' },
    { id: 'landings', label: 'Landings', icon: Layers, path: '/owner/landings' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, path: '/owner/configuracion' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans text-gray-900 bg-gray-100">
      <MetadataUpdater />

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-50">
        <h1 className="text-lg font-bold">Panel de Control</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 md:relative md:translate-x-0
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'w-14' : 'w-72'}
        bg-slate-900 text-slate-300 flex-shrink-0 h-screen flex flex-col
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-sm font-bold text-white">Panel de Control</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Gestión del Negocio</p>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (pathname && pathname.startsWith(`${tab.path}/`));
            return (
              <Link
                key={tab.id}
                href={tab.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? tab.label : undefined}
                className={`
                  w-full flex items-center px-2 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4'}
                  ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <tab.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && <span>{tab.label}</span>}
              </Link>
            );
          })}

          <div className="pt-6 mt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? 'Cerrar Sesión' : undefined}
              className={`w-full flex items-center py-2.5 px-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4'}`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-gray-100 scroll-smooth">
        {needsBoxSync && (
          <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 justify-center">
            ⚠️ Los precios y stock de las presentaciones de caja no se sincronizaron hoy.
            <Link href="/owner/presentacion-cajas" className="underline hover:no-underline">
              Ir a Presentación de Cajas →
            </Link>
          </div>
        )}
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
