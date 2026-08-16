// Add React import to use React.FormEvent
import React, { useState } from 'react';
import { Lock } from 'lucide-react';

type LoginProps = {
  onLogin: (password: string, type: 'owner' | 'admin') => Promise<boolean>;
  type: 'owner' | 'admin';
};

export default function Login({ onLogin, type }: LoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await onLogin(password, type);

    if (!success) {
      setError('Contraseña incorrecta');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B4199] via-[#E91E8C] to-[#00A8E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-[#E91E8C] p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#6B4199] mb-2">
            {type === 'admin' ? 'Panel de Administración' : 'Panel Owner'}
          </h1>
          <p className="text-gray-600 text-sm">
            Ingresa tu contraseña para acceder
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#6B4199] rounded-lg focus:ring-2 focus:ring-[#8d6e5a] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#6B4199] to-[#8d6e5a] text-white py-3 rounded-lg hover:opacity-90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>

          <div className="text-center">
            <a href="/" className="text-sm text-[#E91E8C] hover:text-[#6B4199]">
              ← Volver al sitio
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}