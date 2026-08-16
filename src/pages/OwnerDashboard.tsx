import React, { useState, useEffect } from 'react';
import { Package, ShoppingBag, Mail, Calendar, LogOut, MessageSquare, Settings, Brain, DollarSign, CreditCard, FileText, Save, Image as ImageIcon, MapPin, Facebook, Instagram, Twitter, MessageCircle, Globe, LayoutTemplate, Menu } from 'lucide-react';
import { supabase, Product, Order, Message, ChatSession, Sale } from '../lib/supabase';
import { logout } from '../lib/auth';
import ProductManagement from '../components/owner/ProductManagement';
import CategoryManagement from '../components/owner/CategoryManagement';
import LocationManagement from '../components/owner/LocationManagement';
import OrderManagement from '../components/owner/OrderManagement';
import MessageManagement from '../components/owner/MessageManagement';
import ChatManagement from '../components/owner/ChatManagement';
import AIInstructionsManagement from '../components/owner/AIInstructionsManagement';
import SalesManagement from '../components/owner/SalesManagement';
import CreditPaymentsManagement from '../components/owner/CreditPaymentsManagement';
import InvoiceConfiguration from '../components/owner/InvoiceConfiguration';
import OwnerProductPageContentManagement from '../components/owner/OwnerProductPageContentManagement';
import HomeContentManagement from '../components/owner/HomeContentManagement';
import GeneralSettings from '../components/owner/GeneralSettings';

export default function OwnerDashboard() {

  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      const { data: p } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: m } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      const { data: c } = await supabase.from('chat_sessions').select('*').order('created_at', { ascending: false });
      const { data: s } = await supabase.from('sales').select('*').order('created_at', { ascending: false });

      setProducts(p || []);
      setOrders(o || []);
      setMessages(m || []);
      setChatSessions(c || []);
      setSales(s || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = () => {

    logout();
    window.location.href = '/';
  };

  const tabs = [
    { id: 'home_content', label: 'Contenidos Home', icon: LayoutTemplate },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'product_page_content', label: 'Contenidos Producto', icon: LayoutTemplate },
    { id: 'categories', label: 'Categorías', icon: Globe },
    { id: 'locations', label: 'Locales', icon: MapPin },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'sales', label: 'Ventas', icon: DollarSign },
    { id: 'credits', label: 'Créditos', icon: CreditCard },
    { id: 'invoices', label: 'Facturación', icon: FileText },
    { id: 'messages', label: 'Mensajes', icon: Mail },
    { id: 'chats', label: 'Chats IA', icon: MessageSquare },
    { id: 'ai', label: 'Instrucciones IA', icon: Brain },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const handleProductUpdated = (id: string, changes: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...changes } : p)));
  };

  const handleProductCreated = (product: Product) => {
    setProducts(prev => [product, ...prev]);
  };

  const handleProductRemoved = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleRefreshAll = async () => {
    const { data: p } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(p || []);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">Panel de Administración</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:h-screen overflow-y-auto ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white">Panel de Control</h1>
          <p className="text-xs text-slate-500 mt-1">Gestión del Negocio</p>
        </div>
        <nav className="p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
          <div className="pt-6 mt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-100">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'home_content' && <HomeContentManagement />}
          {activeTab === 'products' && (
            <ProductManagement
              products={products}
              onProductUpdated={handleProductUpdated}
              onProductCreated={handleProductCreated}
              onProductRemoved={handleProductRemoved}
              onRefreshAll={handleRefreshAll}
            />
          )}
          {activeTab === 'product_page_content' && <OwnerProductPageContentManagement />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'locations' && <LocationManagement />}
          {activeTab === 'orders' && <OrderManagement orders={orders} onUpdate={loadData} />}
          {activeTab === 'sales' && <SalesManagement sales={sales} onUpdate={loadData} />}
          {activeTab === 'credits' && <CreditPaymentsManagement />}
          {activeTab === 'invoices' && <InvoiceConfiguration />}
          {activeTab === 'messages' && <MessageManagement messages={messages} onUpdate={loadData} />}
          {activeTab === 'chats' && <ChatManagement chatSessions={chatSessions} onUpdate={loadData} />}
          {activeTab === 'ai' && <AIInstructionsManagement />}
          {activeTab === 'settings' && <GeneralSettings />}
        </div>
      </main>
    </div>
  );
}