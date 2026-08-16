'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, VolumePrice } from '../lib/supabase';

export type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_bulk?: boolean;
  requires_prescription?: boolean;
  stock?: number;
  // Nuevos campos opcionales para volume pricing y presentación de caja
  volume_prices?: VolumePrice[];
  base_price?: number;       // precio base sin descuentos de volumen
  box_factor?: number | null; // unidades por caja (null = no tiene caja)
};

type CartContextType = {
  currentSection: string;
  setCurrentSection: (section: string) => void;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isProductDetailOpen: boolean;
  setIsProductDetailOpen: (isOpen: boolean) => void;
  handleNavigate: (section: string) => void;
  handleAddToCart: (product: Product) => void;
  handleUpdateQuantity: (productId: string, quantity: number) => void;
  handleRemoveItem: (productId: string) => void;
  handleClearCart: () => void;
  handleViewProduct: (product: Product) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [currentSection, setCurrentSection] = useState('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cart_items');
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing cart items', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart_items', JSON.stringify(cartItems));
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
          image_url: product.uploaded_image_url || product.image_url,
          is_bulk: product.is_bulk || false,
          requires_prescription: product.requires_prescription || false,
          stock: product.stock,
          volume_prices: (product as any).volume_prices || [],
          base_price: product.price,
          box_factor: (product as any).box_factor ?? null,
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

  return (
    <CartContext.Provider
      value={{
        currentSection,
        setCurrentSection,
        cartItems,
        setCartItems,
        isCartOpen,
        setIsCartOpen,
        selectedProduct,
        setSelectedProduct,
        isProductDetailOpen,
        setIsProductDetailOpen,
        handleNavigate,
        handleAddToCart,
        handleUpdateQuantity,
        handleRemoveItem,
        handleClearCart,
        handleViewProduct,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
