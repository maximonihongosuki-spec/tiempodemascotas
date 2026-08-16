import Image from 'next/image';
import type { BannerBlock } from './types';

export default function BlockBanner({ block }: { block: BannerBlock }) {
  if (!block.image_url) return null;

  const inner = (
    <div className="relative w-full" style={{ aspectRatio: '4/1' }}>
      <Image src={block.image_url} alt={block.alt || ''} fill className="object-cover" unoptimized />
    </div>
  );

  if (block.link_url) {
    return (
      <section className="w-full">
        <a href={block.link_url} className="block hover:opacity-95 transition-opacity">
          {inner}
        </a>
      </section>
    );
  }

  return <section className="w-full">{inner}</section>;
}
