import Image from 'next/image';
import type { GalleryBlock } from './types';

export default function BlockGallery({ block }: { block: GalleryBlock }) {
  if (!block.images || block.images.length === 0) return null;

  const count = Math.min(block.images.length, 4);
  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };
  const cols = colsMap[count] ?? 'grid-cols-2';

  return (
    <section className="w-full py-6 px-4">
      <div className={`max-w-5xl mx-auto grid ${cols} gap-3`}>
        {block.images.slice(0, 4).map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={img.url}
              alt={img.alt || `Imagen ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    </section>
  );
}
