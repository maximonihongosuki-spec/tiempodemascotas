'use client';
import { ShoppingCart, Menu, X, Facebook, Instagram, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Category } from '../lib/supabase';
import { categoryToSlug } from '../lib/categoryUtils';
import { useCart } from './CartProvider';

type HeaderProps = {
  cartCount?: number;
  onCartClick?: () => void;
  onNavigate?: (section: string) => void;
  currentSection?: string;
};

type SiteSettings = {
  business_name: string;
  logo_url: string;
  uploaded_logo_url: string;
  facebook_enabled: boolean;
  facebook_url: string;
  instagram_enabled: boolean;
  instagram_url: string;
  x_enabled: boolean;
  x_url: string;
};

export default function Header({ cartCount = 0, onCartClick = () => {}, onNavigate, currentSection = 'home' }: HeaderProps) {
  let cartCtx: any = null;
  try {
    cartCtx = useCart();
  } catch (_) {}

  const activeCartCount = cartCtx ? cartCtx.cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0) : cartCount;
  const activeOnCartClick = cartCtx ? () => cartCtx.setIsCartOpen(true) : onCartClick;
  const activeOnNavigate = cartCtx ? cartCtx.handleNavigate : onNavigate;
  const activeCurrentSection = cartCtx ? cartCtx.currentSection : currentSection;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [megaMenuData, setMegaMenuData] = useState<{
    balanceadoBrands: string[];
    granelAges: string[];
    balanceadoBrandsGato: string[];
    granelAgesGato: string[];
  }>({ balanceadoBrands: [], granelAges: [], balanceadoBrandsGato: [], granelAgesGato: [] });
  const [productCounts, setProductCounts] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeSubDropdown, setActiveSubDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subDropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speciesNavRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [megaMenuTop, setMegaMenuTop] = useState(176);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        // +24 por el offset top-[24px] del propio header (la cinta ticker 
        // ocupa esos primeros 24px arriba del header)
        setMegaMenuTop(entry.contentRect.height + 24);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (speciesNavRef.current && !speciesNavRef.current.contains(e.target as Node)) {
        if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
        setActiveDropdown(null);
        setActiveSubDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = useCallback((id: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(id);
  }, []);

  const closeDropdown = useCallback(() => {
    dropdownTimeout.current = setTimeout(() => {
      setActiveDropdown(null);
      setActiveSubDropdown(null);
    }, 150);
  }, []);

  const openSubDropdown = useCallback((id: string) => {
    if (subDropdownTimeout.current) clearTimeout(subDropdownTimeout.current);
    setActiveSubDropdown(id);
  }, []);

  const closeSubDropdown = useCallback(() => {
    subDropdownTimeout.current = setTimeout(() => {
      setActiveSubDropdown(null);
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
  }, []);

  const cancelSubClose = useCallback(() => {
    if (subDropdownTimeout.current) clearTimeout(subDropdownTimeout.current);
  }, []);
  const [settings, setSettings] = useState<SiteSettings>({
    business_name: 'Tiempo de Mascotas',
    logo_url: '',
    uploaded_logo_url: '',
    facebook_enabled: false,
    facebook_url: '',
    instagram_enabled: false,
    instagram_url: '',
    x_enabled: false,
    x_url: ''
  });

  const menuItems = [
    { id: 'home', label: 'Inicio', path: '/' },
    { id: 'catalogo', label: 'Productos', path: '/productos' },
    { id: 'about', label: 'Nosotros', path: '/nosotros' },
    { id: 'contact', label: 'Contacto', path: '/#contact' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchMegaMenuData();
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      if (data) setSettings(data);
    } catch (e) {
      console.error("Error fetching site settings", e);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data) setCategories(data);
    } catch (e) {
      console.error("Error fetching categories", e);
    }
  };

  const fetchMegaMenuData = async () => {
    try {
      // Marcas de Balanceado para Perros
      const { data: balPerroData } = await supabase
        .from('products')
        .select('category_brand')
        .eq('active', true)
        .eq('is_parent', false)
        .overlaps('category_specific', ['Alimento Balanceado', 'Balanceado'])
        .contains('category_species', ['Perros'])
        .not('category_brand', 'is', null)
        .neq('category_brand', '');
      const brandsPerro = Array.from(new Set(
        (balPerroData || []).map((p: any) => p.category_brand).filter(Boolean)
      )).sort() as string[];

      // Marcas de Balanceado para Gatos
      const { data: balGatoData } = await supabase
        .from('products')
        .select('category_brand')
        .eq('active', true)
        .eq('is_parent', false)
        .overlaps('category_specific', ['Alimento Balanceado', 'Balanceado'])
        .contains('category_species', ['Gatos'])
        .not('category_brand', 'is', null)
        .neq('category_brand', '');
      const brandsGato = Array.from(new Set(
        (balGatoData || []).map((p: any) => p.category_brand).filter(Boolean)
      )).sort() as string[];

      // Edades granel para Perros
      const { data: granelPerroData } = await supabase
        .from('products')
        .select('category_age')
        .eq('active', true)
        .eq('is_parent', false)
        .eq('is_bulk', true)
        .contains('category_species', ['Perros'])
        .not('category_age', 'is', null);
      const agesGranelPerro = Array.from(new Set(
        (granelPerroData || []).flatMap((p: any) => p.category_age || []).filter(Boolean)
      )).sort() as string[];

      // Edades granel para Gatos
      const { data: granelGatoData } = await supabase
        .from('products')
        .select('category_age')
        .eq('active', true)
        .eq('is_parent', false)
        .eq('is_bulk', true)
        .contains('category_species', ['Gatos'])
        .not('category_age', 'is', null);
      const agesGranelGato = Array.from(new Set(
        (granelGatoData || []).flatMap((p: any) => p.category_age || []).filter(Boolean)
      )).sort() as string[];

      const { data: countData } = await supabase
        .from('products')
        .select('category_general, category_specific, category_sub_specific, category_species, category_age, category_condition, category_brand, is_bulk, is_prescription, stock, parent_product_id')
        .eq('active', true);

      setMegaMenuData({
        balanceadoBrands: brandsPerro,
        granelAges: agesGranelPerro,
        balanceadoBrandsGato: brandsGato,
        granelAgesGato: agesGranelGato,
      });
      setProductCounts(countData || []);
    } catch (e) {
      console.error('Error fetching mega menu data', e);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/productos?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleLinkClick = (item: typeof menuItems[0]) => {
    if (typeof window === 'undefined') return;

    if (item.path.startsWith('/#')) {
      const section = item.path.replace('/#', '');
      if (window.location.pathname === '/' || window.location.pathname === '/home') {
        activeOnNavigate?.(section);
      } else {
        window.location.href = item.path;
      }
    } else {
      window.location.href = item.path;
    }
    setMobileMenuOpen(false);
  };

  const logoSrc = settings.uploaded_logo_url || settings.logo_url;
  const isClient = typeof window !== 'undefined';
  const currentPath = isClient ? window.location.pathname : '';

  const speciesNav = [
    { id: 'alimentos_perro', label: 'Alimentos Perro' },
    { id: 'alimentos_gato', label: 'Alimentos Gato' },
    { id: 'cuidado', label: 'Cuidado e Higiene' },
    { id: 'farmacia', label: 'Farmacia' },
    { id: 'accesorios', label: 'Accesorios y Varios' },
    { id: 'otros', label: 'Otros Animales' },
  ];

  // Categorías específicas de Cuidado, Higiene y Bienestar
  const catCuidado = categories.find(c => c.type === 'general' && c.name === 'Cuidado, Higiene y Bienestar');
  const specsCuidado = catCuidado ? categories.filter(c => c.type === 'specific' && c.parent_id === catCuidado.id) : [];

  // Categorías de Accesorios
  const catAccesorios = categories.find(c => c.type === 'general' && c.name === 'Accesorios');
  const specsAccesorios = catAccesorios ? categories.filter(c => c.type === 'specific' && c.parent_id === catAccesorios.id) : [];

  // Categorías de Varios
  const catVarios = categories.find(c => c.type === 'general' && c.name === 'Varios');
  const specsVarios = catVarios ? categories.filter(c => c.type === 'specific' && c.parent_id === catVarios.id) : [];

  // Farmacia
  const catFarmacia = categories.find(c => c.type === 'general' && c.name === 'Salud y Farmacia Veterinaria');
  const catAntipulgas = categories.find(c => c.type === 'specific' && c.name === 'Antipulgas y desparasitarios');
  const subAntipulgas = catAntipulgas ? categories.filter(c => c.type === 'sub_specific' && c.parent_id === catAntipulgas.id) : [];
  const catFarmacos = categories.find(c => c.type === 'specific' && c.name === 'Fármacos');
  const subFarmacos = catFarmacos ? categories.filter(c => c.type === 'sub_specific' && c.parent_id === catFarmacos.id) : [];

  // Condiciones para Nutrición Especial
  const condicionesPerro = [
    'Articular/Movilidad','Cardíaco','Gastrointestinal','Hepático',
    'Hipoalergénico','Obesidad','Oncológico','recuperacion',
    'Renal','Urinario'
  ];
  const condicionesGato = ['Gastrointestinal','Hipoalergénico','Hepático','Obesidad','Renal','Urinario'];

  // Etiquetas display para condiciones
  const condicionLabel: Record<string, string> = {
    'Articular/Movilidad': 'Articular / Motriz',
    'recuperacion': 'Recuperación',
    'Obesidad': 'Obesidad y Diabetes',
  };

  function countMatching(filters: {
    catGen?: string;       // puede venir con pipe: 'Accesorios|Accesorios Varios'
    catSpec?: string;       // idem
    catSubSpec?: string;
    species?: string;
    age?: string;
    condition?: string;    // puede venir con pipe
    brand?: string;
    bulk?: boolean;
    prescription?: boolean;
  }): number {
    return productCounts.filter((p: any) => {
      if (filters.catGen) {
        const vals = filters.catGen.split('|');
        if (!Array.isArray(p.category_general) || !vals.some(v => p.category_general.includes(v))) return false;
      }
      if (filters.catSpec) {
        const vals = filters.catSpec.split('|');
        if (!Array.isArray(p.category_specific) || !vals.some(v => p.category_specific.includes(v))) return false;
      }
      if (filters.catSubSpec) {
        if (!p.category_sub_specific || !String(p.category_sub_specific).toLowerCase().includes(filters.catSubSpec.toLowerCase())) return false;
      }
      if (filters.species) {
        if (!Array.isArray(p.category_species) || !p.category_species.includes(filters.species)) return false;
      }
      if (filters.age) {
        if (!Array.isArray(p.category_age) || !p.category_age.includes(filters.age)) return false;
      }
      if (filters.condition) {
        const vals = filters.condition.split('|');
        if (!Array.isArray(p.category_condition) || !vals.some(v => p.category_condition.includes(v))) return false;
      }
      if (filters.brand) {
        if (p.category_brand !== filters.brand) return false;
      }
      if (filters.bulk) {
        if (!p.is_bulk) return false;
      }
      if (filters.prescription) {
        if (!p.is_prescription) return false;
      }
      return true;
    }).length;
  }

  const getButtonClass = (isEmpty: boolean, extraClasses: string = '') => {
    return `block w-full text-left py-0.5 transition-colors ${extraClasses} ${
      isEmpty
        ? 'text-gray-300 opacity-50 cursor-not-allowed pointer-events-none'
        : 'text-gray-600 hover:text-[#1A8A00] hover:font-semibold'
    }`;
  };

  return (
    <header 
      ref={headerRef}
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      } bg-white top-[24px]`}
    >
      {/* Cinta amarilla movida a NavTicker */}

      <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
        {/* Main Navbar Row */}
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'h-16' : 'h-20 md:h-24'}`}>
          <div 
            className="flex items-center cursor-pointer group gap-2 transition-all duration-300 shrink-0"
            onClick={() => { if (isClient) window.location.href = '/'; }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`${settings.business_name} - Veterinaria`}
                className={`${isScrolled ? 'h-12' : 'h-11 md:h-16'} w-auto object-contain transition-all duration-300 flex-shrink-0`}
                loading="eager"
                fetchPriority="high"
                width={150}
                height={40}
              />
            ) : (
              <span className="text-xl md:text-2xl font-display font-bold tracking-tight text-white flex-shrink-0">
                {settings.business_name || 'Tiempo de Mascotas'}
              </span>
            )}
          </div>

          <nav className="hidden lg:flex items-center space-x-1 p-1 rounded-full bg-[#1A8A00]/10 border border-[#1A8A00]/20">
            {menuItems.map((item) => (
              <a
                key={item.id}
                href={item.path}
                onClick={(e) => {
                  if (item.path.startsWith('/#')) {
                    e.preventDefault();
                    handleLinkClick(item);
                  }
                }}
                className={`px-5 py-2 rounded-full text-sm font-display font-semibold transition-all duration-300 ${
                  activeCurrentSection === item.id || currentPath === item.path
                    ? 'bg-[#1A8A00] text-white shadow-sm'
                    : 'text-[#1A8A00] hover:bg-[#1A8A00]/10'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <a
              href="/miembros/login"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-colors text-[#166534] hover:bg-[#166534]/10 border border-[#166534]/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Miembros
            </a>
            <div className="hidden lg:flex items-center gap-2 pr-4 mr-2 border-r border-[#1A8A00]/20">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" className="text-[#1A8A00] hover:bg-[#1A8A00]/10 p-2 rounded-full transition-all"><Facebook size={18} /></a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" className="text-[#1A8A00] hover:bg-[#1A8A00]/10 p-2 rounded-full transition-all"><Instagram size={18} /></a>
              )}
            </div>

            <button
              onClick={activeOnCartClick}
              className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-full font-display font-bold text-xs md:text-sm transition-all hover:scale-105 shadow-md bg-[#1A8A00] text-white hover:bg-[#064E3B]"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Carrito</span>
              {activeCartCount > 0 && (
                <span className="rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-[10px] md:text-xs ml-1 px-1.5 shadow-sm bg-[#1A8A00] text-white">
                  {activeCartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full transform transition-all text-[#1A8A00] bg-white hover:bg-gray-100 shadow-sm"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Navbar Inferior (Desktop Only) */}
        <div className="hidden lg:flex items-center justify-between py-4 border-t transition-all border-gray-200">
          <div className="flex items-center gap-6" ref={speciesNavRef}>
            {speciesNav.map((nav) => (
              <div
                key={nav.id}
                className="relative"
              >
                <button
                  onClick={() => {
                    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
                    setActiveDropdown(prev => prev === nav.id ? null : nav.id);
                  }}
                  className="flex items-center gap-1.5 font-display font-bold text-sm transition-colors py-2 text-[#166534] hover:text-[#064E3B]"
                >
                  {nav.label}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === nav.id ? 'rotate-180' : ''}`} />
                </button>

                {/* ═══ ALIMENTOS PERRO ═══ */}
                {activeDropdown === nav.id && nav.id === 'alimentos_perro' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150 overflow-y-auto"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100, maxHeight: `calc(100vh - ${megaMenuTop}px)` }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-6 gap-6">

                        {/* Col 1 — Por Marcas */}
                        <div>
                          <a href={`/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento Balanceado')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Balanceado por Marcas
                          </a>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {megaMenuData.balanceadoBrands.length > 0
                              ? megaMenuData.balanceadoBrands.map(brand => (
                                <a key={brand}
                                  href={`/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento Balanceado')}&brand=${encodeURIComponent(brand)}`}
                                  className="block w-full text-left text-xs text-gray-600 hover:text-[#1A8A00] hover:font-semibold py-0.5 transition-colors">
                                  {brand}
                                </a>
                              ))
                              : <p className="text-xs text-gray-400 italic">Sin datos aún</p>
                            }
                          </div>
                        </div>

                        {/* Col 2 — Por Kilo */}
                        <div>
                          <a href={`/productos?species=Perros&bulk=true`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Por Kilo
                          </a>
                          <div className="space-y-1">
                            {[
                              { label: 'Kilo Cachorro', age: 'Cachorro' },
                              { label: 'Kilo Adulto', age: 'Adulto' },
                              { label: 'Kilo Senior', age: 'Senior' },
                            ].map(item => {
                              const isEmpty = countMatching({ species: 'Perros', bulk: true, age: item.age }) === 0;
                              return (
                                <a key={item.label}
                                  href={isEmpty ? undefined : `/productos?species=Perros&bulk=true&age=${encodeURIComponent(item.age)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                            {(() => {
                              const isEmpty = countMatching({ species: 'Perros', bulk: true, prescription: true }) === 0;
                              return (
                                <a
                                  href={isEmpty ? undefined : `/productos?species=Perros&bulk=true&prescription=true`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  Kilo Prescripción
                                </a>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Col 3 — Por Edad */}
                        <div>
                          <a href={`/productos?species=Perros&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Por Edad
                          </a>
                          <div className="space-y-1">
                            {['Starter','Cachorro','Adulto','Senior','Castrado'].map(age => {
                              const isEmpty = countMatching({ species: 'Perros', age }) === 0;
                              return (
                                <a key={age}
                                  href={isEmpty ? undefined : `/productos?species=Perros&age=${encodeURIComponent(age)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {age}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 4 — Nutrición Especial */}
                        <div>
                          <a href={`/productos?species=Perros`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Nutrición Especial
                          </a>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {condicionesPerro.map(cond => {
                              const isEmpty = countMatching({ species: 'Perros', condition: cond, catGen: 'Alimentos Balanceados y Húmedos' }) === 0;
                              return (
                                <a key={cond}
                                  href={isEmpty ? undefined : `/productos?species=Perros&condition=${encodeURIComponent(cond)}&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  🐾 {condicionLabel[cond] || cond}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 5 — Húmedos */}
                        <div>
                          <a href={`/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento húmedo')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Húmedos
                          </a>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {(() => {
                              const isEmpty = countMatching({ species: 'Perros', catSpec: 'Alimento húmedo' }) === 0;
                              return (
                                <a
                                  href={isEmpty ? undefined : `/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento húmedo')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  De uso diario
                                </a>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Col 6 — Snacks y otros */}
                        <div>
                          <a href={`/productos?species=Perros&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Snacks y otros
                          </a>
                          <div className="space-y-1">
                            <a
                              href={`/productos?species=Perros&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`}
                              className="block w-full text-left text-xs text-gray-600 hover:text-[#1A8A00] hover:font-semibold py-0.5 transition-colors">
                              Ver todos los snacks
                            </a>
                          </div>
                        </div>

                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                        <a href="/productos?species=Perros"
                          className="text-xs font-bold text-[#1A8A00] hover:text-[#064E3B] transition-colors">
                          Ver todos los productos para Perros →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ ALIMENTOS GATO ═══ */}
                {activeDropdown === nav.id && nav.id === 'alimentos_gato' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150 overflow-y-auto"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100, maxHeight: `calc(100vh - ${megaMenuTop}px)` }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-6 gap-6">

                        {/* Col 1 — Por Marcas */}
                        <div>
                          <a href={`/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento Balanceado')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Balanceado por Marcas
                          </a>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {megaMenuData.balanceadoBrandsGato.length > 0
                              ? megaMenuData.balanceadoBrandsGato.map(brand => (
                                <a key={brand}
                                  href={`/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento Balanceado')}&brand=${encodeURIComponent(brand)}`}
                                  className="block w-full text-left text-xs text-gray-600 hover:text-[#1A8A00] hover:font-semibold py-0.5 transition-colors">
                                  {brand}
                                </a>
                              ))
                              : <p className="text-xs text-gray-400 italic">Sin datos aún</p>
                            }
                          </div>
                        </div>

                        {/* Col 2 — Por Kilo */}
                        <div>
                          <a href={`/productos?species=Gatos&bulk=true`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Por Kilo
                          </a>
                          <div className="space-y-1">
                            {megaMenuData.granelAgesGato.length > 0
                              ? megaMenuData.granelAgesGato.map(age => {
                                const isEmpty = countMatching({ species: 'Gatos', bulk: true, age }) === 0;
                                return (
                                  <a key={age}
                                    href={isEmpty ? undefined : `/productos?species=Gatos&bulk=true&age=${encodeURIComponent(age)}`}
                                    className={getButtonClass(isEmpty, 'text-xs')}>
                                    Kilo {age}
                                  </a>
                                );
                              })
                              : <p className="text-xs text-gray-400 italic">Sin productos a granel</p>
                            }
                          </div>
                        </div>

                        {/* Col 3 — Por Edad */}
                        <div>
                          <a href={`/productos?species=Gatos&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Por Edad
                          </a>
                          <div className="space-y-1">
                            {['Starter','Cachorro','Adulto','Castrado','Senior'].map(age => {
                              const isEmpty = countMatching({ species: 'Gatos', age }) === 0;
                              return (
                                <a key={age}
                                  href={isEmpty ? undefined : `/productos?species=Gatos&age=${encodeURIComponent(age)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {age === 'Castrado' ? 'Adulto Castrado' : age}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 4 — Nutrición Especial */}
                        <div>
                          <a href={`/productos?species=Gatos`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Nutrición Especial
                          </a>
                          <div className="space-y-1">
                            {condicionesGato.map(cond => {
                              const isEmpty = countMatching({ species: 'Gatos', condition: cond, catGen: 'Alimentos Balanceados y Húmedos' }) === 0;
                              return (
                                <a key={cond}
                                  href={isEmpty ? undefined : `/productos?species=Gatos&condition=${encodeURIComponent(cond)}&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  🐾 {condicionLabel[cond] || cond}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 5 — Húmeda */}
                        <div>
                          <a href={`/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento húmedo')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Húmeda
                          </a>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {(() => {
                              const isEmpty = countMatching({ species: 'Gatos', catSpec: 'Alimento húmedo' }) === 0;
                              return (
                                <a
                                  href={isEmpty ? undefined : `/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento húmedo')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  De uso diario
                                </a>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Col 6 — Snacks */}
                        <div>
                          <a href={`/productos?species=Gatos&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Snacks
                          </a>
                          <div className="space-y-1">
                            <a
                              href={`/productos?species=Gatos&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`}
                              className="block w-full text-left text-xs text-gray-600 hover:text-[#1A8A00] hover:font-semibold py-0.5 transition-colors">
                              Ver todos los snacks
                            </a>
                            {(() => {
                              const isEmpty = countMatching({ species: 'Gatos', catSpec: 'Arenas y piedritas higiénicas' }) === 0;
                              return (
                                <a
                                  href={isEmpty ? undefined : `/productos?species=Gatos&cat_spec=${encodeURIComponent('Arenas y piedritas higiénicas')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  Arenas higiénicas
                                </a>
                              );
                            })()}
                          </div>
                        </div>

                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                        <a href="/productos?species=Gatos"
                          className="text-xs font-bold text-[#1A8A00] hover:text-[#064E3B] transition-colors">
                          Ver todos los productos para Gatos →
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ CUIDADO E HIGIENE ═══ */}
                {activeDropdown === nav.id && nav.id === 'cuidado' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100 }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00]">
                            Higiene y Limpieza
                          </p>
                          <div className="space-y-1">
                            {[
                              { label: 'Shampoo / Acondicionador / Jabón', spec: 'Shampoo/acondicionadores/jabón' },
                              { label: 'Colonias / Perfumes', spec: 'Perfumes/colonia/loción' },
                              { label: 'Toallitas / Tapetes / Pañales', spec: 'Toallitas, tapete y pañales' },
                              { label: 'Higiene Bucal', spec: 'higiene bucal' },
                              { label: 'Higiene Ótica', spec: 'higiene ótico' },
                              { label: 'Higiene Ocular', spec: 'higiene ocular' },
                              { label: 'Higiene Ambiental', spec: 'higiene ambiental' },
                            ].map(item => {
                              const isEmpty = countMatching({ catSpec: item.spec }) === 0;
                              return (
                                <a key={item.spec}
                                  href={isEmpty ? undefined : `/productos?cat_spec=${encodeURIComponent(item.spec)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00]">
                            Bienestar
                          </p>
                          <div className="space-y-1">
                            {[
                              { label: 'Feromonas y análogos', spec: 'Feromonas y análogos' },
                              { label: 'Educadores', spec: 'Educador' },
                              { label: 'Arenas higiénicas', spec: 'Arenas y piedritas higiénicas' },
                            ].map(item => {
                              const isEmpty = countMatching({ catSpec: item.spec }) === 0;
                              return (
                                <a key={item.spec}
                                  href={isEmpty ? undefined : `/productos?cat_spec=${encodeURIComponent(item.spec)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00]">
                            Por Especie
                          </p>
                          <div className="space-y-1">
                            {['Perros','Gatos'].map(sp => {
                              const isEmpty = countMatching({ species: sp, catGen: 'Cuidado, Higiene y Bienestar' }) === 0;
                              return (
                                <a key={sp}
                                  href={isEmpty ? undefined : `/productos?species=${encodeURIComponent(sp)}&cat_gen=${encodeURIComponent('Cuidado, Higiene y Bienestar')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  Cuidado para {sp}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ FARMACIA VETERINARIA ═══ */}
                {activeDropdown === nav.id && nav.id === 'farmacia' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150 overflow-y-auto"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100, maxHeight: `calc(100vh - ${megaMenuTop}px)` }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-3 gap-8">

                        {/* Col 1 — Antipulgas */}
                        <div>
                          <a href={`/productos?cat_spec=${encodeURIComponent('Antipulgas y desparasitarios')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Antipulgas y Desparasitarios
                          </a>
                          <div className="space-y-1">
                            {subAntipulgas.map(sub => {
                              const isEmpty = countMatching({ catSubSpec: sub.name }) === 0;
                              return (
                                <a key={sub.id}
                                  href={isEmpty ? undefined : `/productos?cat_sub_spec=${encodeURIComponent(sub.name)}`}
                                  className={getButtonClass(isEmpty, 'text-xs capitalize')}>
                                  {sub.name}
                                </a>
                              );
                            })}
                            {subAntipulgas.length === 0 && <p className="text-xs text-gray-400 italic">Sin subcategorías</p>}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Por especie</p>
                            {['Perros','Gatos'].map(sp => {
                              const isEmpty = countMatching({ species: sp, catSpec: 'Antipulgas y desparasitarios' }) === 0;
                              return (
                                <a key={sp}
                                  href={isEmpty ? undefined : `/productos?species=${encodeURIComponent(sp)}&cat_spec=${encodeURIComponent('Antipulgas y desparasitarios')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  Para {sp}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 2 — Fármacos */}
                        <div>
                          <a href={`/productos?cat_spec=${encodeURIComponent('Fármacos')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Fármacos
                          </a>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 max-h-72 overflow-y-auto">
                            {subFarmacos
                              .filter(sub => !['antiflatuletos','higiene, clínicas Gral.','neuropático'].includes(sub.name))
                              .map(sub => {
                                const isEmpty = countMatching({ catSubSpec: sub.name }) === 0;
                                return (
                                  <a key={sub.id}
                                    href={isEmpty ? undefined : `/productos?cat_sub_spec=${encodeURIComponent(sub.name)}`}
                                    className={getButtonClass(isEmpty, 'text-[10px] capitalize')}>
                                    {sub.name}
                                  </a>
                                );
                              })}
                          </div>
                        </div>

                        {/* Col 3 — Ropa médica + acceso rápido */}
                        <div>
                          <a href={`/productos?cat_sub_spec=${encodeURIComponent('ropa pos-quirúrgicas')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Ropa Médica / Post-Quirúrgica
                          </a>
                          <div className="space-y-1">
                            {[
                              { label: 'Ropa post-quirúrgica', sub: 'ropa pos-quirúrgicas' },
                            ].map(item => {
                              const isEmpty = countMatching({ catSubSpec: item.sub }) === 0;
                              return (
                                <a key={item.sub}
                                  href={isEmpty ? undefined : `/productos?cat_sub_spec=${encodeURIComponent(item.sub)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Accesos rápidos</p>
                            <div className="space-y-1">
                              {[
                                { label: '🩺 Con receta', url: '/productos?prescription=true' },
                                { label: '🩺 Alimentos con prescripción', url: `/productos?prescription=true&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}` },
                                { label: '💊 Ver toda la farmacia', url: `/productos?cat_gen=${encodeURIComponent('Salud y Farmacia Veterinaria')}` },
                              ].map(item => (
                                <a key={item.url}
                                  href={item.url}
                                  className="block w-full text-left text-xs text-gray-600 hover:text-[#1A8A00] hover:font-semibold py-1 px-2 rounded hover:bg-green-50 transition-colors border border-gray-100">
                                  {item.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ ACCESORIOS Y VARIOS ═══ */}
                {activeDropdown === nav.id && nav.id === 'accesorios' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100 }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-3 gap-8">

                        {/* Col 1 — Accesorios */}
                        <div>
                          <a href={`/productos?cat_gen=${encodeURIComponent('Accesorios')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Accesorios
                          </a>
                          <div className="space-y-1">
                            {[
                              { label: 'Arnés / Collar / Correa / Pecheras', spec: 'Arnés, collar, correa y pecheras' },
                              { label: 'Comederos / Bebederos', spec: 'Comederos y bebederos' },
                              { label: 'Juguetes', spec: 'Juguetes' },
                              { label: 'Mochilas / Bolsos / Transportadores', spec: 'Mochilas, bolsos y transportadores' },
                              { label: 'Casas / Corrales / Jaulas', spec: 'casas, jaulas, corrales' },
                              { label: 'Camas / Colchonetas', spec: 'Camas y colchonetas' },
                              { label: 'Ropa pos-quirúrgicas', sub: 'ropa pos-quirúrgicas' },
                              { label: 'Ropa de uso frecuente o diario', sub: 'ropa uso diario' },
                              { label: 'Rascadores', spec: 'Rascadores' },
                              { label: 'Areneros y accesorios', spec: 'Areneros y accesorios' },
                            ].map(item => {
                              const isEmpty = 'sub' in item
                                ? countMatching({ catSubSpec: item.sub }) === 0
                                : countMatching({ catSpec: item.spec }) === 0;
                              return (
                                <a key={item.label}
                                  href={isEmpty ? undefined : ('sub' in item ? `/productos?cat_sub_spec=${encodeURIComponent(item.sub!)}` : `/productos?cat_spec=${encodeURIComponent(item.spec!)}`)}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 2 — Varios */}
                        <div>
                          <a href={`/productos?cat_gen=${encodeURIComponent('Varios')}`}
                            className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                            Varios
                          </a>
                          <div className="space-y-1">
                            {[
                              { label: 'Fumigación / Insecticidas', spec: 'Fumigación insecticidas' },
                              { label: 'Limpieza y Desinfección', spec: 'Limpieza y Desinfección' },
                              { label: 'Insumos veterinarios', spec: 'insumos veterinarios' },
                            ].map(item => {
                              const isEmpty = countMatching({ catSpec: item.spec }) === 0;
                              return (
                                <a key={item.spec}
                                  href={isEmpty ? undefined : `/productos?cat_spec=${encodeURIComponent(item.spec)}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  {item.label}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                        {/* Col 3 — Por especie */}
                        <div>
                          <p className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00]">
                            Por Especie
                          </p>
                          <div className="space-y-1">
                            {['Perros','Gatos','Aves','Roedores','Peces','Tortugas'].map(sp => {
                              const isEmpty = countMatching({ species: sp, catGen: 'Accesorios' }) === 0;
                              return (
                                <a key={sp}
                                  href={isEmpty ? undefined : `/productos?species=${encodeURIComponent(sp)}&cat_gen=${encodeURIComponent('Accesorios')}`}
                                  className={getButtonClass(isEmpty, 'text-xs')}>
                                  Accesorios para {sp}
                                </a>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ OTROS ANIMALES ═══ */}
                {activeDropdown === nav.id && nav.id === 'otros' && (
                  <div
                    className="fixed left-0 right-0 bg-white shadow-2xl border-t-2 border-[#1A8A00] animate-in fade-in duration-150"
                    style={{ top: `${megaMenuTop}px`, zIndex: 100 }}
                    onMouseEnter={cancelClose}
                    onMouseLeave={closeDropdown}
                  >
                    <div className="max-w-7xl mx-auto px-8 py-6">
                      <div className="grid grid-cols-4 gap-8">
                        {[
                          { label: '🐦 Aves', species: 'Aves' },
                          { label: '🐭 Roedores', species: 'Roedores' },
                          { label: '🐟 Peces', species: 'Peces' },
                          { label: '🐢 Tortugas', species: 'Tortugas' },
                        ].map(animal => (
                          <div key={animal.species}>
                            <a href={`/productos?species=${encodeURIComponent(animal.species)}`}
                              className="block text-[11px] font-black text-[#1A8A00] uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#1A8A00] w-full text-left hover:text-[#064E3B]">
                              {animal.label}
                            </a>
                            <div className="space-y-1">
                              {[
                                { label: 'Alimentos y premios', spec: 'Alimentos y premios' },
                                { label: 'Fármacos', spec: 'Fármacos' },
                                { label: 'Accesorios', gen: 'Accesorios' },
                                { label: 'Medicina y Cuidado', gen: 'Medicina y Cuidado' },
                              ].map(item => {
                                const isEmpty = 'gen' in item
                                  ? countMatching({ species: animal.species, catGen: item.gen }) === 0
                                  : countMatching({ species: animal.species, catSpec: item.spec }) === 0;
                                return (
                                  <a key={item.label}
                                    href={isEmpty ? undefined : ('gen' in item ? `/productos?species=${encodeURIComponent(animal.species)}&cat_gen=${encodeURIComponent(item.gen!)}` : `/productos?species=${encodeURIComponent(animal.species)}&cat_spec=${encodeURIComponent(item.spec!)}`)}
                                    className={getButtonClass(isEmpty, 'text-xs')}>
                                    {item.label}
                                  </a>
                                );
                              })}
                              {(() => {
                                const specieAccesorios = `accesorios para ${animal.species.toLowerCase()}`;
                                const isEmptyAccesoriosEspecie = countMatching({ species: animal.species, catSpec: specieAccesorios }) === 0;
                                return (
                                  <a
                                    href={isEmptyAccesoriosEspecie ? undefined : `/productos?species=${encodeURIComponent(animal.species)}&cat_spec=${encodeURIComponent(specieAccesorios)}`}
                                    className={getButtonClass(isEmptyAccesoriosEspecie, 'text-xs')}>
                                    Accesorios para {animal.label.replace(/^[^\s]+\s/, '')}
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 max-w-md ml-8">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, marcas..."
                className={`w-full pl-10 pr-4 py-2 rounded-full text-sm font-display font-medium border focus:ring-2 transition-all outline-none bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#166534] focus:ring-[#166534]/10 shadow-inner`}
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-2xl border-b border-gray-100 p-6 flex flex-col space-y-4 animate-in slide-in-from-top duration-300 overflow-y-auto max-h-[80vh]">
          <a
            href="/miembros/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-[#166534]/20 text-[#166534] font-display font-black uppercase text-sm hover:bg-[#166534]/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Ingresar / Área de Miembros
          </a>

          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border-none text-[#1E1B4B] font-display font-bold text-sm focus:ring-2 focus:ring-[#1A8A00]"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </form>

          {/* Mobile Nav Items — Links básicos */}
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item)}
                className={`w-full text-left font-display font-bold py-2.5 px-3 rounded-xl transition-all text-sm ${
                  currentPath === item.path ? 'bg-[#1A8A00] text-white' : 'text-[#1E1B4B] hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Megamenú Accordion */}
          <div className="border-t border-gray-100 pt-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 mb-1.5">Categorías</p>
            <div className="space-y-0.5">

              {/* ══ ALIMENTOS PERRO ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'alimentos_perro' ? null : 'alimentos_perro')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Alimentos Perro</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'alimentos_perro' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'alimentos_perro' && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Balanceado por Marcas</p>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                        {megaMenuData.balanceadoBrands.length > 0
                          ? megaMenuData.balanceadoBrands.map((brand: string) => {
                              const isEmpty = countMatching({ species: 'Perros', catSpec: 'Alimento Balanceado', brand }) === 0;
                              return <button key={brand} onClick={() => { window.location.href = `/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento Balanceado')}&brand=${encodeURIComponent(brand)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{brand}</button>;
                            })
                          : <p className="text-[11px] text-gray-400 italic">Cargando...</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Kilo</p>
                      <div className="space-y-0.5">
                        {megaMenuData.granelAges.map((age: string) => {
                          const isEmpty = countMatching({ species: 'Perros', bulk: true, age }) === 0;
                          return <button key={age} onClick={() => { window.location.href = `/productos?species=Perros&bulk=true&age=${encodeURIComponent(age)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{age}</button>;
                        })}
                        {(() => { const isEmpty = countMatching({ species: 'Perros', bulk: true, prescription: true }) === 0; return <button onClick={() => { window.location.href = `/productos?species=Perros&bulk=true&prescription=true`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>Prescripción</button>; })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Edad</p>
                      <div className="space-y-0.5">
                        {['Starter','Cachorro','Adulto','Castrado','Senior'].map(age => {
                          const isEmpty = countMatching({ species: 'Perros', age }) === 0;
                          return <button key={age} onClick={() => { window.location.href = `/productos?species=Perros&age=${encodeURIComponent(age)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{age}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Nutrición Especial</p>
                      <div className="space-y-0.5">
                        {condicionesPerro.map(cond => {
                          const label = condicionLabel[cond] ?? cond;
                          const isEmpty = countMatching({ species: 'Perros', condition: cond, catGen: 'Alimentos Balanceados y Húmedos' }) === 0;
                          return <button key={cond} onClick={() => { window.location.href = `/productos?species=Perros&condition=${encodeURIComponent(label)}&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{label}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Húmedos</p>
                      {(() => { const isEmpty = countMatching({ species: 'Perros', catSpec: 'Alimento húmedo' }) === 0; return <button onClick={() => { window.location.href = `/productos?species=Perros&cat_spec=${encodeURIComponent('Alimento húmedo')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>De uso diario</button>; })()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Snacks y otros</p>
                      <button onClick={() => { window.location.href = `/productos?species=Perros&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`; setMobileMenuOpen(false); }} className="block w-full text-left text-[11px] text-gray-600 hover:text-[#1A8A00] py-0.5">Ver todos los snacks</button>
                    </div>
                    <button onClick={() => { window.location.href = `/productos?species=Perros`; setMobileMenuOpen(false); }} className="w-full text-center text-[11px] font-bold text-[#166534] border border-[#166534]/30 rounded-lg py-1.5 hover:bg-[#166534]/5">Ver todos los alimentos para Perros →</button>
                  </div>
                )}
              </div>

              {/* ══ ALIMENTOS GATO ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'alimentos_gato' ? null : 'alimentos_gato')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Alimentos Gato</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'alimentos_gato' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'alimentos_gato' && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Balanceado por Marcas</p>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                        {megaMenuData.balanceadoBrandsGato.length > 0
                          ? megaMenuData.balanceadoBrandsGato.map((brand: string) => {
                              const isEmpty = countMatching({ species: 'Gatos', catSpec: 'Alimento Balanceado', brand }) === 0;
                              return <button key={brand} onClick={() => { window.location.href = `/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento Balanceado')}&brand=${encodeURIComponent(brand)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{brand}</button>;
                            })
                          : <p className="text-[11px] text-gray-400 italic">Cargando...</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Kilo</p>
                      <div className="space-y-0.5">
                        {megaMenuData.granelAgesGato.map((age: string) => {
                          const isEmpty = countMatching({ species: 'Gatos', bulk: true, age }) === 0;
                          return <button key={age} onClick={() => { window.location.href = `/productos?species=Gatos&bulk=true&age=${encodeURIComponent(age)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{age}</button>;
                        })}
                        {(() => { const isEmpty = countMatching({ species: 'Gatos', bulk: true, prescription: true }) === 0; return <button onClick={() => { window.location.href = `/productos?species=Gatos&bulk=true&prescription=true`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>Prescripción</button>; })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Edad</p>
                      <div className="space-y-0.5">
                        {['Cachorro','Adulto','Castrado','Senior'].map(age => {
                          const isEmpty = countMatching({ species: 'Gatos', age }) === 0;
                          return <button key={age} onClick={() => { window.location.href = `/productos?species=Gatos&age=${encodeURIComponent(age)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{age}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Nutrición Especial</p>
                      <div className="space-y-0.5">
                        {condicionesGato.map(cond => {
                          const label = condicionLabel[cond] ?? cond;
                          const isEmpty = countMatching({ species: 'Gatos', condition: cond, catGen: 'Alimentos Balanceados y Húmedos' }) === 0;
                          return <button key={cond} onClick={() => { window.location.href = `/productos?species=Gatos&condition=${encodeURIComponent(label)}&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{label}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Húmeda</p>
                      {(() => { const isEmpty = countMatching({ species: 'Gatos', catSpec: 'Alimento húmedo' }) === 0; return <button onClick={() => { window.location.href = `/productos?species=Gatos&cat_spec=${encodeURIComponent('Alimento húmedo')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>De uso diario</button>; })()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Snacks</p>
                      <button onClick={() => { window.location.href = `/productos?species=Gatos&cat_spec=${encodeURIComponent('Snacks, premios y galletas')}`; setMobileMenuOpen(false); }} className="block w-full text-left text-[11px] text-gray-600 hover:text-[#1A8A00] py-0.5">Ver todos los snacks</button>
                      {(() => { const isEmpty = countMatching({ species: 'Gatos', catSpec: 'Arenas y piedritas higiénicas' }) === 0; return <button onClick={() => { window.location.href = `/productos?species=Gatos&cat_spec=${encodeURIComponent('Arenas y piedritas higiénicas')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>Arenas higiénicas</button>; })()}
                    </div>
                    <button onClick={() => { window.location.href = `/productos?species=Gatos`; setMobileMenuOpen(false); }} className="w-full text-center text-[11px] font-bold text-[#166534] border border-[#166534]/30 rounded-lg py-1.5 hover:bg-[#166534]/5">Ver todos los alimentos para Gatos →</button>
                  </div>
                )}
              </div>

              {/* ══ CUIDADO E HIGIENE ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'cuidado' ? null : 'cuidado')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Cuidado e Higiene</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'cuidado' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'cuidado' && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Categorías</p>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
                        {specsCuidado.map(spec => {
                          const isEmpty = countMatching({ catSpec: spec.name }) === 0;
                          return <button key={spec.id} onClick={() => { window.location.href = `/productos?cat_spec=${encodeURIComponent(spec.name)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{spec.name}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Especie</p>
                      <div className="space-y-0.5">
                        {['Perros','Gatos'].map(sp => {
                          const isEmpty = countMatching({ species: sp, catGen: 'Cuidado, Higiene y Bienestar' }) === 0;
                          return <button key={sp} onClick={() => { window.location.href = `/productos?species=${encodeURIComponent(sp)}&cat_gen=${encodeURIComponent('Cuidado, Higiene y Bienestar')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{sp}</button>;
                        })}
                      </div>
                    </div>
                    <button onClick={() => { window.location.href = `/productos?cat_gen=${encodeURIComponent('Cuidado, Higiene y Bienestar')}`; setMobileMenuOpen(false); }} className="w-full text-center text-[11px] font-bold text-[#166534] border border-[#166534]/30 rounded-lg py-1.5 hover:bg-[#166534]/5">Ver todo Cuidado e Higiene →</button>
                  </div>
                )}
              </div>

              {/* ══ FARMACIA ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'farmacia' ? null : 'farmacia')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Farmacia</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'farmacia' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'farmacia' && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Fármacos</p>
                      <button onClick={() => { window.location.href = `/productos?cat_spec=${encodeURIComponent('Fármacos')}`; setMobileMenuOpen(false); }} className="block w-full text-left text-[11px] font-bold text-[#1A8A00] hover:text-[#064E3B] py-0.5 mb-1">Ver todos los fármacos</button>
                      <div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
                        {subFarmacos.map(sub => {
                          const isEmpty = countMatching({ catSubSpec: sub.name }) === 0;
                          return <button key={sub.id} onClick={() => { window.location.href = `/productos?cat_sub_spec=${encodeURIComponent(sub.name)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{sub.name}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Antipulgas y desparasitarios</p>
                      <button onClick={() => { window.location.href = `/productos?cat_spec=${encodeURIComponent('Antipulgas y desparasitarios')}`; setMobileMenuOpen(false); }} className="block w-full text-left text-[11px] font-bold text-[#1A8A00] hover:text-[#064E3B] py-0.5 mb-1">Ver todos</button>
                      <div className="space-y-0.5">
                        {subAntipulgas.map(sub => {
                          const isEmpty = countMatching({ catSubSpec: sub.name }) === 0;
                          return <button key={sub.id} onClick={() => { window.location.href = `/productos?cat_sub_spec=${encodeURIComponent(sub.name)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{sub.name}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Ropa veterinaria</p>
                      <div className="space-y-0.5">
                        {[{label:'Ropa pos-quirúrgica',val:'ropa pos-quirúrgicas'},{label:'Ropa uso diario',val:'ropa uso diario'}].map(item => {
                          const isEmpty = countMatching({ catSubSpec: item.val }) === 0;
                          return <button key={item.val} onClick={() => { window.location.href = `/productos?cat_sub_spec=${encodeURIComponent(item.val)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{item.label}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Especiales</p>
                      <div className="space-y-0.5">
                        {(() => { const isEmpty = countMatching({ prescription: true }) === 0; return <button onClick={() => { window.location.href = `/productos?prescription=true`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>Con receta</button>; })()}
                        {(() => { const isEmpty = countMatching({ prescription: true, catGen: 'Alimentos Balanceados y Húmedos' }) === 0; return <button onClick={() => { window.location.href = `/productos?prescription=true&cat_gen=${encodeURIComponent('Alimentos Balanceados y Húmedos')}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>Alimentos con prescripción</button>; })()}
                      </div>
                    </div>
                    <button onClick={() => { window.location.href = `/productos?cat_gen=Farmacia`; setMobileMenuOpen(false); }} className="w-full text-center text-[11px] font-bold text-[#166534] border border-[#166534]/30 rounded-lg py-1.5 hover:bg-[#166534]/5">Ver toda la farmacia →</button>
                  </div>
                )}
              </div>

              {/* ══ ACCESORIOS Y VARIOS ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'accesorios' ? null : 'accesorios')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Accesorios y Varios</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'accesorios' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'accesorios' && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Accesorios</p>
                      <div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
                        {specsAccesorios.map(spec => {
                          const isEmpty = countMatching({ catSpec: spec.name }) === 0;
                          return <button key={spec.id} onClick={() => { window.location.href = `/productos?cat_spec=${encodeURIComponent(spec.name)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{spec.name}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Varios</p>
                      <div className="space-y-0.5">
                        {specsVarios.map(spec => {
                          const isEmpty = countMatching({ catSpec: spec.name }) === 0;
                          return <button key={spec.id} onClick={() => { window.location.href = `/productos?cat_spec=${encodeURIComponent(spec.name)}`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{spec.name}</button>;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">Por Especie</p>
                      <div className="space-y-0.5">
                        {['Perros','Gatos'].map(sp => {
                          const isEmpty = countMatching({ species: sp, catGen: 'Accesorios' }) === 0;
                          return <button key={sp} onClick={() => { window.location.href = `/productos?species=${encodeURIComponent(sp)}&cat_gen=Accesorios`; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{sp}</button>;
                        })}
                      </div>
                    </div>
                    <button onClick={() => { window.location.href = `/productos?cat_gen=Accesorios`; setMobileMenuOpen(false); }} className="w-full text-center text-[11px] font-bold text-[#166534] border border-[#166534]/30 rounded-lg py-1.5 hover:bg-[#166534]/5">Ver todos los accesorios →</button>
                  </div>
                )}
              </div>

              {/* ══ OTROS ANIMALES ══ */}
              <div>
                <button onClick={() => setMobileActiveSection(prev => prev === 'otros' ? null : 'otros')}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-sm text-[#166534]">Otros Animales</span>
                  <ChevronDown size={15} className={`text-[#166534] transition-transform ${mobileActiveSection === 'otros' ? 'rotate-180' : ''}`} />
                </button>
                {mobileActiveSection === 'otros' && (
                  <div className="px-3 pb-3 space-y-3">
                    {(['Aves','Roedores','Peces','Tortugas'] as const).map(sp => (
                      <div key={sp}>
                        <p className="text-[10px] font-black text-[#1A8A00] uppercase tracking-wider mb-1 pb-1 border-b border-[#1A8A00]/20">{sp}</p>
                        <div className="space-y-0.5">
                          {[
                            { label: 'Alimentos y premios', url: `/productos?species=${encodeURIComponent(sp)}&cat_spec=${encodeURIComponent('Alimentos y premios')}`, match: { species: sp, catSpec: 'Alimentos y premios' } },
                            { label: 'Fármacos', url: `/productos?species=${encodeURIComponent(sp)}&cat_spec=${encodeURIComponent('Fármacos')}`, match: { species: sp, catSpec: 'Fármacos' } },
                            { label: 'Accesorios', url: `/productos?species=${encodeURIComponent(sp)}&cat_gen=Accesorios`, match: { species: sp, catGen: 'Accesorios' } },
                            { label: 'Medicina y Cuidado', url: `/productos?species=${encodeURIComponent(sp)}&cat_gen=${encodeURIComponent('Medicina y Cuidado')}`, match: { species: sp, catGen: 'Medicina y Cuidado' } },
                            { label: `Accesorios para ${sp.toLowerCase()}`, url: `/productos?species=${encodeURIComponent(sp)}&cat_spec=${encodeURIComponent(`accesorios para ${sp.toLowerCase()}`)}`, match: { species: sp, catSpec: `accesorios para ${sp.toLowerCase()}` } },
                          ].map(item => {
                            const isEmpty = countMatching(item.match) === 0;
                            return <button key={item.label} onClick={() => { window.location.href = item.url; setMobileMenuOpen(false); }} className={getButtonClass(isEmpty, 'text-[11px]')} disabled={isEmpty}>{item.label}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex gap-4 pt-4 justify-center border-t border-gray-100">
             {settings.facebook_url && <a href={settings.facebook_url} target="_blank" className="p-3 bg-gray-50 rounded-full text-[#1A8A00] hover:bg-gray-100"><Facebook size={24} /></a>}
             {settings.instagram_url && <a href={settings.instagram_url} target="_blank" className="p-3 bg-gray-50 rounded-full text-[#1A8A00] hover:bg-gray-100"><Instagram size={24} /></a>}
          </div>
        </div>
      )}
    </header>
  );
}