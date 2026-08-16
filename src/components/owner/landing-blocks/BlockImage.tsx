import Image from 'next/image';
import type { ImageBlock } from './types';

export default function BlockImage({ block }: { block: ImageBlock }) {
  const hasImage = !!block.image_url;

  if (block.width === 'full') {
    return (
      <section className="w-full">
        {/* padding-bottom: 56.25% = aspect ratio 16:9, compatible con next/image fill */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {hasImage ? (
            <Image
              src={block.image_url}
              alt={block.alt || ''}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              📷 Sin imagen — subí una en el editor
            </div>
          )}
        </div>
      </section>
    );
  }

  // width === 'contained'
  return (
    <section className="w-full py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {hasImage ? (
            <Image
              src={block.image_url}
              alt={block.alt || ''}
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              📷 Sin imagen — subí una en el editor
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
