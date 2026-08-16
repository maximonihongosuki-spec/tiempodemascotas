'use client';
import { useState, useTransition } from 'react';
import { submitReview } from '@/app/actions/reviews';

export default function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (rating === 0 || name.length < 2 || comment.length < 20) {
      setErrorMsg('Completá todos los campos. El comentario debe tener al menos 20 caracteres.');
      setStatus('error');
      return;
    }

    startTransition(async () => {
      const res = await submitReview({ productId, authorName: name, authorEmail: email, rating, comment });
      if (res.success) {
        setStatus('success');
        setRating(0); setName(''); setEmail(''); setComment('');
      } else {
        setErrorMsg(res.error || 'Error al enviar la reseña');
        setStatus('error');
      }
    });
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 text-center">
        <div className="text-4xl mb-2">✓</div>
        <h3 className="text-xl font-bold text-green-800 mb-2">¡Gracias por tu reseña!</h3>
        <p className="text-green-700 text-sm">La revisaremos y publicaremos pronto.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 md:p-8 shadow-sm">
      <h3 className="text-2xl font-display font-bold text-[#1E1B4B] mb-2">Escribí tu reseña</h3>
      <p className="text-sm text-gray-500 mb-6">Contá tu experiencia con {productName}</p>

      {/* Estrellas */}
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="text-4xl transition-transform hover:scale-110"
          >
            <span className={n <= (hover || rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <input
          type="text"
          placeholder="Tu nombre *"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={80}
          className="px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
        />
        <input
          type="email"
          placeholder="Tu email (no se publica)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          maxLength={120}
          className="px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
        />
      </div>

      <textarea
        placeholder="Contanos tu experiencia (mínimo 20 caracteres) *"
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        rows={4}
        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none mb-4"
      />
      <div className="text-xs text-gray-400 text-right mb-4">{comment.length} / 1000</div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 text-sm">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full py-3 bg-[#1A8A00] hover:bg-[#064E3B] disabled:bg-gray-300 text-white rounded-2xl font-display font-bold uppercase tracking-wider text-sm transition-colors"
      >
        {isPending ? 'Enviando…' : 'Enviar reseña'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        Tu reseña será revisada antes de publicarse. No compartimos tu email.
      </p>
    </div>
  );
}
