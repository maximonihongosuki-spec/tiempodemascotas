import Link from 'next/link';
import { PawPrint, Clock } from 'lucide-react';

export default function PendientePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#eeee22] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-[#166534]" />
        </div>
        <h1 className="text-2xl font-display font-black text-[#166534] uppercase mb-2">
          Cuenta en revisión
        </h1>
        <p className="text-gray-600 mb-2">
          Tu solicitud de cuenta <strong>de veterinario</strong> todavía está siendo revisada.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Te notificaremos por email cuando tu cuenta sea aprobada. Este proceso puede tomar hasta 24–48 horas hábiles.
        </p>
        <Link href="/"
          className="inline-block w-full py-3 bg-[#166534] text-white rounded-xl font-display font-black uppercase text-sm hover:bg-[#064E3B] transition-colors">
          Volver al sitio
        </Link>
      </div>
    </div>
  );
}
