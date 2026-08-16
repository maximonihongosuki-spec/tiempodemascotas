import type { CtaBlock } from './types';

export default function BlockCTA({ block }: { block: CtaBlock }) {
  if (!block.text || !block.url) return null;

  return (
    <section className="w-full py-8 px-4 text-center">
      <a
        href={block.url}
        className={`inline-block font-bold px-10 py-4 rounded-lg transition-colors text-base uppercase tracking-wide ${
          block.style === 'primary'
            ? 'bg-[#166534] text-white hover:bg-[#064E3B]'
            : 'bg-[#eeee22] text-[#1E1B4B] hover:bg-yellow-300'
        }`}
      >
        {block.text}
      </a>
    </section>
  );
}
