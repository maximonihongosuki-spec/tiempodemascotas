import { supabaseAuth } from './supabase-auth';

// Mantener compatibilidad con código existente que usa estas funciones
// Ahora delegan a Supabase Auth en lugar de localStorage

export const ownerLogin = async (password: string): Promise<boolean> => {
  // Deprecated — usar app/owner/login/page.tsx con Supabase Auth
  return false;
};

export const adminLogin = async (password: string): Promise<boolean> => {
  // Deprecated — usar app/admin/login/page.tsx con Supabase Auth
  return false;
};

export const supplierLogin = async (password: string): Promise<boolean> => {
  return false;
};

export const isOwnerAuthenticated = (): boolean => {
  // El middleware ahora maneja la protección de rutas
  return true;
};

export const isAdminAuthenticated = (): boolean => {
  // El middleware ahora maneja la protección de rutas
  return true;
};

export const isSupplierAuthenticated = (): boolean => {
  return false;
};

export const logout = async () => {
  await supabaseAuth.auth.signOut();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};
