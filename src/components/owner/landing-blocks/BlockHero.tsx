import Image from 'next/image';
import type { HeroBlock } from './types';

export default function BlockHero({ block }: { block: HeroBlock }) {
  return (
    <section className="relative w-full min-h-[300px] md:min-h-[400px] overflow-hidden">
      {block.image_url ? (
        <Image
          src={block.image_url}
          alt={block.title || 'Hero'}
          fill
          className="object-cover"
          unoptimized
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-[#166534]" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] px-6 py-12 text-center">
        {block.title && (
          <h1 className="font-display font-black uppercase tracking-tight text-3xl md:text-5xl text-white mb-4 max-w-4xl">
            {block.title}
          </h1>
        )}
        {block.subtitle && (
          <p className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl">
            {block.subtitle}
          </p>
        )}
        {block.cta_text && block.cta_url && (
          <a
            href={block.cta_url}
            className="inline-block bg-[#eeee22] text-[#1E1B4B] font-bold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors text-base uppercase tracking-wide"
          >
            {block.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}
