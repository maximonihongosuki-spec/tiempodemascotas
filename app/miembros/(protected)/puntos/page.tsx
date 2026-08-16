import { Star, Gift, Trophy, Zap } from 'lucide-react';
import { getMemberSession } from '../../../../src/lib/memberSession';

export const dynamic = 'force-dynamic';

export default async function PuntosPage() {
  const session = await getMemberSession();
  const profile = session!.profile; // el layout ya garantiza que existe

  const points = profile.points || 0;

  const tiers = [
    { label: 'Bronce', min: 0,    perks: '5% descuento · Acceso al catálogo (Próximamente)' },
    { label: 'Plata',  min: 500,  perks: '8% descuento · Envío gratis +500k (Próximamente)' },
    { label: 'Oro',    min: 2000, perks: '12% descuento · Envío gratis siempre (Próximamente)' },
  ];

  const currentTier = [...tiers].reverse().find(t => points >= t.min) || tiers[0];
  const nextTier = tiers.find(t => t.min > points);
  const pct = nextTier ? Math.min(100, Math.round((points / nextTier.min) * 100)) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Puntos y Recompensas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Tu programa de fidelización</p>
      </div>

      {/* Balance hero */}
      <div className="bg-[#166534] rounded-2xl p-6 md:p-8 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Puntos disponibles</p>
            <p className="text-5xl font-black text-[#eeee22] mt-1 leading-none">{points.toLocaleString('es-PY')}</p>
            <p className="text-white/50 text-xs mt-2">1 punto = Gs. 100 de descuento</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <p className="text-white/60 text-xs font-semibold uppercase">Nivel actual</p>
            <p className="text-white font-black text-lg mt-0.5">{currentTier.label}</p>
          </div>
        </div>

        {nextTier && (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>{currentTier.label} · {currentTier.min} pts</span>
              <span>{nextTier.label} · {nextTier.min} pts</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#eeee22] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/70 text-xs mt-2">
              Te faltan <span className="text-[#eeee22] font-bold">{(nextTier.min - points).toLocaleString()} puntos</span> para alcanzar {nextTier.label}
            </p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-bold text-amber-800">
          ⏳ El sistema de puntos está en preparación
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Muy pronto vas a poder empezar a acumular y canjear puntos con tus compras.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Zap,    title: 'Ganás puntos',   desc: 'Por cada Gs. 1.000 en compras ganás 1 punto',          bg: 'bg-yellow-50' },
          { icon: Gift,   title: 'Canjeás puntos', desc: 'Usá tus puntos como descuento en tu próxima compra',    bg: 'bg-green-50' },
          { icon: Trophy, title: 'Subís de nivel', desc: 'Más puntos = mayores descuentos y beneficios',          bg: 'bg-blue-50' },
        ].map(item => (
          <div key={item.title} className={`${item.bg} rounded-2xl p-5 border border-white`}>
            <item.icon className="w-7 h-7 text-[#166534] mb-3" />
            <h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Niveles del programa</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {tiers.map(tier => {
            const reached = points >= tier.min;
            const isCurrent = tier.label === currentTier.label;
            return (
              <div key={tier.label} className={`flex items-center justify-between px-5 py-4 ${isCurrent ? 'bg-[#166534]/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-[#eeee22] text-[#166534]' : reached ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {reached ? '✓' : tier.label[0]}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isCurrent ? 'text-[#166534]' : 'text-gray-700'}`}>
                      {tier.label}
                      {isCurrent && <span className="ml-2 text-[10px] bg-[#166534] text-white px-2 py-0.5 rounded-full font-semibold">ACTUAL</span>}
                    </p>
                    <p className="text-xs text-gray-400">{tier.perks}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400 font-mono">{tier.min} pts</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#eeee22]/15 border border-[#eeee22]/50 rounded-2xl p-5 text-center">
        <p className="font-bold text-[#166534] text-sm">🚀 Canje de recompensas próximamente</p>
        <p className="text-gray-500 text-xs mt-1">Estamos preparando el catálogo de recompensas para vos</p>
      </div>
    </div>
  );
}
