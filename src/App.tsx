import React, { useState, useEffect } from 'react';
import { isOwnerAuthenticated, isAdminAuthenticated, ownerLogin, adminLogin } from './lib/auth';
import { Product } from './lib/supabase';
import Footer from './components/Footer';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import About from './components/About';
import Contact from './components/Contact';
import ChatWidget from './components/ChatWidget';
import SocialMedia from './components/SocialMedia';
import PromoBanner from './components/PromoBanner';
import WhatsAppButton from './components/WhatsAppButton';
import FooterCredit from './components/FooterCredit';
import MetadataUpdater from './components/MetadataUpdater';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import InstruccionesPage from './pages/InstruccionesPage';
import ProductPage from './pages/ProductPage';
import SupplierLogin from './pages/SupplierLogin';
import SupplierDashboard from './pages/SupplierDashboard';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Header from './components/Header';

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  requires_prescription?: boolean;
  stock?: number;
};

function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const [currentSection, setCurrentSection] = useState('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  useEffect(() => {
    // Solo accedemos a window.location en el cliente
    setCurrentPath(window.location.pathname);
    
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    
    const saved = localStorage.getItem('cart_items');
    if (saved) {
      setCartItems(JSON.parse(saved));
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product: Product) => {
    const maxStock = typeof product.stock === 'number' ? product.stock : Infinity;
    if (maxStock <= 0) {
      alert(`"${product.public_name || product.name}" no tiene stock disponible.`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= maxStock) {
          alert(`Solo hay ${maxStock} unidad(es) en stock de "${product.public_name || product.name}".`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.public_name || product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url,
          requires_prescription: product.requires_prescription || false,
          stock: product.stock,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const maxStock = typeof item.stock === 'number' ? item.stock : Infinity;
        return { ...item, quantity: Math.min(quantity, maxStock) };
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDetailOpen(true);
  };

  const handleLogin = async (password: string, type: 'owner' | 'admin'): Promise<boolean> => {
    if (type === 'admin') {
      const success = await adminLogin(password);
      if (success) {
        window.location.href = '/admin';
      }
      return success;
    } else {
      const success = await ownerLogin(password);
      if (success) {
        window.location.href = '/owner';
      }
      return success;
    }
  };

  // Wrapper para asegurar que MetadataUpdater esté presente en TODAS las vistas
  const withMetadata = (component: React.ReactElement) => (
    <>
      <MetadataUpdater />
      {component}
    </>
  );

  if (currentPath === '/instrucciones') {
    return withMetadata(<InstruccionesPage />);
  }

  if (currentPath === '/politica-de-privacidad') {
    return withMetadata(<PrivacyPolicyPage />);
  }

  if (currentPath === '/proveedores') {
    return withMetadata(<SupplierLogin />);
  }

  if (currentPath === '/panel-proveedor') {
    return withMetadata(<SupplierDashboard />);
  }

  if (currentPath === '/owner') {
    if (!isOwnerAuthenticated()) {
      return withMetadata(<Login onLogin={handleLogin} type="owner" />);
    }
    return withMetadata(<OwnerDashboard />);
  }

  if (currentPath === '/admin') {
    if (!isAdminAuthenticated()) {
      return withMetadata(<Login onLogin={handleLogin} type="admin" />);
    }
    return withMetadata(<AdminPanel />);
  }

  if (currentPath !== '/' && currentPath !== '/home') {
    const productSlug = currentPath.substring(1);
    return withMetadata(<ProductPage productCode={productSlug} />);
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return withMetadata(
    <div className="min-h-screen bg-white">
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        currentSection={currentSection}
      />

      <div>
        <section id="home">
          <Hero />
          <ProductGrid
            onAddToCart={handleAddToCart}
            onViewProduct={handleViewProduct}
          />
        </section>

        <section id="about">
          <About />
        </section>

        <section id="contact">
          <Contact />
        </section>

        <SocialMedia />
      </div>

      <Footer />
      <FooterCredit />

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      <ProductDetail
        product={selectedProduct}
        isOpen={isProductDetailOpen}
        onClose={() => setIsProductDetailOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <ChatWidget />
      <WhatsAppButton />
      <PromoBanner />
    </div>
  );
}

export default App;