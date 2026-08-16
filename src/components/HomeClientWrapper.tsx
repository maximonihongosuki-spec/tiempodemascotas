'use client';
import React from 'react';
import { useCart } from './CartProvider';
import Cart from './Cart';
import ProductDetail from './ProductDetail';
import ChatWidget from './ChatWidget';
import WhatsAppButton from './WhatsAppButton';
import PromoBanner from './PromoBanner';

export default function HomeClientWrapper() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    selectedProduct,
    isProductDetailOpen,
    setIsProductDetailOpen,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleAddToCart,
  } = useCart();

  return (
    <>
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
    </>
  );
}
