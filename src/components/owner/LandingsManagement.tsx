'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutTemplate, List, Grid, Plus, Pencil, Trash2,
  ExternalLink, Copy, CheckCheck, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Landing {
  id: string;
  slug: string;
  title: string;
  status: 'borrador' | 'publicada';
  is_indexable: boolean;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialLandings: Landing[];
}

const BASE_URL = 'https://tiempodemascotas.com.py';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function generateDefaultSlug() {
  return `landing-${Date.now()}`;
}

export default function LandingsManagement({ initialLandings }: Props) {
  const router = useRouter();
  const [landings, setLandings] = useState<Landing[]>(initialLandings);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Persistir preferencia de vista
  useEffect(() => {
    const saved = localStorage.getItem('tm_landings_view');
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, []);

  // Sincronización client-side: garantiza que la lista esté fresca,
  // igual que ya hace LandingEditor.tsx para el detalle de una landing.
  useEffect(() => {
    const syncFromDB = async () => {
      try {
        const { data } = await supabase
          .from('landings')
          .select('id, slug, title, status, is_indexable, og_image_url, created_at, updated_at')
          .order('updated_at', { ascending: false });
        if (data) setLandings(data);
      } catch (err) {
        console.error('Error al sincronizar lista de landings:', err);
      }
    };
    syncFromDB();
  }, []);

  const handleViewChange = (v: 'grid' | 'list') => {
    setView(v);
    localStorage.setItem('tm_landings_view', v);
  };

  // ── Nueva landing ──────────────────────────────────────────────────
  const handleNew = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('landings')
        .insert([{
          title: 'Landing sin título',
          slug: generateDefaultSlug(),
          status: 'borrador',
          blocks: [],
        }])
        .select('id')
        .single();
      if (error) throw error;
      router.push(`/owner/landings/${data.id}`);
    } catch (err: any) {
      alert('Error al crear la landing: ' + (err.message || 'Desconocido'));
      setIsCreating(false);
    }
  };

  // ── Eliminar landing ───────────────────────────────────────────────
  const handleDelete = async (landing: Landing) => {
    const confirmed = confirm(
      `¿Eliminár la landing "${landing.title}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setDeletingId(landing.id);
    try {
      const { error } = await supabase.from('landings').delete().eq('id', landing.id);
      if (error) throw error;
      setLandings(prev => prev.filter(l => l.id !== landing.id));
    } catch (err: any) {
      alert('Error al eliminar: ' + (err.message || 'Desconocido'));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Copiar URL ─────────────────────────────────────────────────────
  const handleCopy = (landing: Landing) => {
    navigator.clipboard.writeText(`${BASE_URL}/promo/${landing.slug}`);
    setCopiedId(landing.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Badges ─────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: Landing['status'] }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
      ${status === 'publicada'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-600'
      }`}>
      {status === 'publicada' ? '● Publicada' : '○ Borrador'}
    </span>
  );

  // ── Thumbnail ──────────────────────────────────────────────────────
  const Thumbnail = ({ landing, className }: { landing: Landing; className?: string }) => (
    <div className={`relative bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center ${className}`}>
      {landing.og_image_url ? (
        <Image
          src={landing.og_image_url}
          alt={landing.title}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Layers size={32} />
          <span className="text-xs">Sin imagen</span>
        </div>
      )}
    </div>
  );

  // ── Empty state ────────────────────────────────────────────────────
  if (landings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Landings</h1>
            <p className="text-sm text-gray-500 mt-1">Páginas de promociones y avisos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const { data } = await supabase
                  .from('landings')
                  .select('id, slug, title, status, is_indexable, og_image_url, created_at, updated_at')
                  .order('updated_at', { ascending: false });
                if (data) setLandings(data);
              }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Actualizar lista"
            >
              ↻ Refrescar
            </button>
            <button
              onClick={handleNew}
              disabled={isCreating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
              {isCreating ? 'Creando...' : 'Nueva landing'}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <Layers size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay landings todavía</h3>
          <p className="text-gray-400 text-sm mb-6">Creá tu primera landing para publicar promociones o avisos.</p>
          <button
            onClick={handleNew}
            disabled={isCreating}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            {isCreating ? 'Creando...' : 'Nueva landing'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Landings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {landings.length} {landings.length === 1 ? 'landing' : 'landings'} ·{' '}
            {landings.filter(l => l.status === 'publicada').length} publicadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista cuadrícula"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => handleViewChange('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Vista lista"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={async () => {
              const { data } = await supabase
                .from('landings')
                .select('id, slug, title, status, is_indexable, og_image_url, created_at, updated_at')
                .order('updated_at', { ascending: false });
              if (data) setLandings(data);
            }}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Actualizar lista"
          >
            ↻ Refrescar
          </button>
          <button
            onClick={handleNew}
            disabled={isCreating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            {isCreating ? 'Creando...' : 'Nueva landing'}
          </button>
        </div>
      </div>

      {/* ── Vista Cuadrícula ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {landings.map(landing => (
            <div key={landing.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <Thumbnail landing={landing} className="h-36" />
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{landing.title}</h3>
                  <StatusBadge status={landing.status} />
                </div>
                <p className="text-xs text-gray-400 font-mono mb-1 truncate">/promo/{landing.slug}</p>
                <p className="text-xs text-gray-400 mb-4">Actualizada {formatDate(landing.updated_at)}</p>
                <div className="flex items-center gap-2 mt-auto flex-wrap">
                  <a
                    href={`/owner/landings/${landing.id}`}
                    className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </a>
                  {landing.status === 'publicada' && (
                    <>
                      <a
                        href={`${BASE_URL}/promo/${landing.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <ExternalLink size={12} /> Ver
                      </a>
                      <button
                        onClick={() => handleCopy(landing)}
                        className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        title="Copiar URL"
                      >
                        {copiedId === landing.id ? <CheckCheck size={12} /> : <Copy size={12} />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(landing)}
                    disabled={deletingId === landing.id}
                    className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ml-auto"
                  >
                    <Trash2 size={12} />
                    {deletingId === landing.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista Lista ── */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Landing</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Actualizada</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {landings.map(landing => (
                <tr key={landing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 relative overflow-hidden">
                        {landing.og_image_url ? (
                          <Image src={landing.og_image_url} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Layers size={16} />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-gray-800 line-clamp-1">{landing.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-gray-400">/promo/{landing.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={landing.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                    {formatDate(landing.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`/owner/landings/${landing.id}`}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </a>
                      {landing.status === 'publicada' && (
                        <>
                          <a
                            href={`${BASE_URL}/promo/${landing.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ver landing"
                          >
                            <ExternalLink size={15} />
                          </a>
                          <button
                            onClick={() => handleCopy(landing)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title={copiedId === landing.id ? '¡Copiado!' : 'Copiar URL'}
                          >
                            {copiedId === landing.id ? <CheckCheck size={15} className="text-green-600" /> : <Copy size={15} />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(landing)}
                        disabled={deletingId === landing.id}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
