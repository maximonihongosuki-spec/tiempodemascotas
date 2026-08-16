'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, Check, X, Trash2, Calendar, User, ExternalLink, CheckCircle2 } from 'lucide-react';
import { moderateReview, deleteReview } from './actions';

interface Review {
  id: string;
  product_id: string;
  author_name: string;
  author_email: string | null;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderator_notes: string | null;
  created_at: string;
  products: {
    name: string;
    url_slug: string;
  } | null;
}

interface ReviewsClientProps {
  initialReviews: Review[];
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export default function ReviewsClient({ initialReviews, counts }: ReviewsClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await moderateReview(id, 'approved');
      if (!res.success) alert('Error: ' + res.error);
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      const res = await moderateReview(id, 'rejected');
      if (!res.success) alert('Error: ' + res.error);
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta reseña? Esta acción no se puede deshacer.')) {
      startTransition(async () => {
        const res = await deleteReview(id);
        if (!res.success) alert('Error: ' + res.error);
      });
    }
  };
  
  // Filter reviews by active status tab
  const filteredReviews = initialReviews.filter(review => review.status === activeTab);

  // Helper to render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5" id={`stars-container-${rating}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            id={`star-${star}`}
            size={16}
            className={`${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Moderación de Reseñas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa, aprueba o rechaza las valoraciones enviadas por los clientes para su visualización en Google y en la tienda.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pending Card */}
        <div 
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'pending' 
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20' 
              : 'bg-white border-gray-200 hover:border-amber-200 hover:bg-gray-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-800 bg-amber-100/60 px-3 py-1 rounded-full">
              Pendientes
            </span>
            <MessageSquare className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900">{counts.pending}</span>
            <span className="text-xs text-gray-500 ml-2">por moderar</span>
          </div>
        </div>

        {/* Approved Card */}
        <div 
          onClick={() => setActiveTab('approved')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'approved' 
              ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20' 
              : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-gray-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-800 bg-emerald-100/60 px-3 py-1 rounded-full">
              Aprobadas
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900">{counts.approved}</span>
            <span className="text-xs text-gray-500 ml-2">visibles en web</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div 
          onClick={() => setActiveTab('rejected')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'rejected' 
              ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20' 
              : 'bg-white border-gray-200 hover:border-rose-200 hover:bg-gray-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-800 bg-rose-100/60 px-3 py-1 rounded-full">
              Rechazadas
            </span>
            <X className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900">{counts.rejected}</span>
            <span className="text-xs text-gray-500 ml-2">ocultas</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Pendientes ({counts.pending})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'approved'
              ? 'border-emerald-500 text-emerald-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Aprobadas ({counts.approved})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'rejected'
              ? 'border-rose-500 text-rose-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Rechazadas ({counts.rejected})
        </button>
      </div>

      {/* Main Reviews List/Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700">No hay reseñas en este estado</p>
            <p className="text-sm text-gray-400 mt-1">
              Las nuevas reseñas escritas por clientes aparecerán aquí para tu aprobación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Autor / Cliente</th>
                  <th className="px-6 py-4">Calificación</th>
                  <th className="px-6 py-4">Comentario</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Producto */}
                    <td className="px-6 py-4 max-w-xs">
                      {review.products ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 line-clamp-1">{review.products.name}</span>
                          <Link
                            href={`/${review.products.url_slug}`}
                            target="_blank"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            Ver producto <ExternalLink size={10} />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Producto eliminado</span>
                      )}
                    </td>

                    {/* Autor */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-800">{review.author_name}</span>
                        </div>
                        {review.author_email && (
                          <span className="text-xs text-gray-500 ml-5">{review.author_email}</span>
                        )}
                        {review.verified_purchase && (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 mt-1 self-start">
                            Compra Verificada
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Calificación */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-500 font-medium">({review.rating} de 5)</span>
                      </div>
                    </td>

                    {/* Comentario */}
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-gray-700 leading-relaxed text-xs break-words whitespace-pre-line">
                        {review.comment}
                      </p>
                      {review.moderator_notes && (
                        <div className="mt-2 text-xs bg-gray-50 border border-gray-100 rounded-lg p-2 text-gray-600">
                          <span className="font-bold text-gray-500">Nota del moderador:</span> {review.moderator_notes}
                        </div>
                      )}
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {review.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(review.id)}
                            disabled={isPending}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Aprobar reseña"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {review.status === 'pending' && (
                          <button
                            onClick={() => handleReject(review.id)}
                            disabled={isPending}
                            className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors disabled:opacity-50"
                            title="Rechazar reseña"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(review.id)}
                          disabled={isPending}
                          className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar reseña"
                        >
                          <Trash2 size={16} />
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
    </div>
  );
}
