'use client';
import { useState, useRef, useEffect } from 'react';
import { XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  iconSize?: number;
  delayMs?: number;
  eager?: boolean;
};

/**
 * Indicador de estado de imagen + carga diferida al hover.
 * - Sin src: ícono X roja (no hay imagen cargada para este producto).
 * - Con src: ícono check verde. Al hacer hover >= delayMs, carga la imagen real.
 * - Si la carga falla: ícono de advertencia ámbar (imagen rota).
 */
export default function LazyHoverImage({
  src,
  alt = '',
  className = '',
  iconSize = 16,
  delayMs = 300,
  eager = false,
}: Props) {
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSrc = !!src;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!hasSrc || shouldLoad || errored) return;
    timeoutRef.current = setTimeout(() => {
      setShouldLoad(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Sin imagen: indicador rojo, no hace nada al hover (no hay nada para cargar)
  if (!hasSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 ${className}`}
        title="Sin imagen cargada"
      >
        <XCircle size={iconSize} className="text-red-400" />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      title={
        errored
          ? 'La imagen no se pudo cargar (URL rota)'
          : shouldLoad
          ? alt
          : 'Tiene imagen — pasá el mouse para verla'
      }
    >
      {/* Indicador verde "tiene imagen", visible hasta que se confirme la carga */}
      {!shouldLoad && !errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-50">
          <CheckCircle2 size={iconSize} className="text-green-500" />
        </div>
      )}

      {/* Indicador ámbar si la URL existe pero la imagen no carga (rota) */}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50">
          <AlertTriangle size={iconSize} className="text-amber-500" />
        </div>
      )}

      {shouldLoad && !errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
