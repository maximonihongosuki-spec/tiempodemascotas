import type { TextWithTitleBlock } from './types';

const sizeMap = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };

export default function BlockTextWithTitle({ block }: { block: TextWithTitleBlock }) {
  return (
    <section className="w-full py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {block.title && (
          <h2 className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl text-[#166534] mb-4">
            {block.title}
          </h2>
        )}
        {block.text && (
          <p className={`text-[#1E1B4B] whitespace-pre-wrap leading-relaxed ${sizeMap[block.size] ?? 'text-base'}`}>
            {block.text}
          </p>
        )}
      </div>
    </section>
  );
}
