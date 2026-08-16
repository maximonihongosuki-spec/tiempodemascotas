'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectCountdown({ to, seconds = 4 }: { to: string; seconds?: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const router = useRouter();

  useEffect(() => {
    if (remaining <= 0) {
      router.push(to);
      return;
    }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, to, router]);

  return (
    <p className="text-xs text-gray-400">
      Te llevamos a tu pedido en {remaining}...
    </p>
  );
}
