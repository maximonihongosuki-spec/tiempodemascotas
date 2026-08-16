import Image from 'next/image';
import type { TwoColumnsBlock } from './types';

export default function BlockTwoColumns({ block }: { block: TwoColumnsBlock }) {
  const imageEl = (
    <div className="relative w-full aspect-square md:min-h-[300px] rounded-xl overflow-hidden bg-gray-100">
      {block.image_url ? (
        <Image src={block.image_url} alt={block.alt || ''} fill className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}
    </div>
  );

  const textEl = (
    <div className="flex flex-col justify-center py-4">
      {block.title && (
        <h2 className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl text-[#166534] mb-4">
          {block.title}
        </h2>
      )}
      {block.text && (
        <p className="text-[#1E1B4B] text-base leading-relaxed whitespace-pre-wrap">
          {block.text}
        </p>
      )}
    </div>
  );

  return (
    <section className="w-full py-10 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {block.image_side === 'left' ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}
