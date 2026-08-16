import type { Block } from './landing-blocks/types';
import BlockHero from './landing-blocks/BlockHero';
import BlockTextWithTitle from './landing-blocks/BlockTextWithTitle';
import BlockImage from './landing-blocks/BlockImage';
import BlockGallery from './landing-blocks/BlockGallery';
import BlockCTA from './landing-blocks/BlockCTA';
import BlockSpacer from './landing-blocks/BlockSpacer';
import BlockBanner from './landing-blocks/BlockBanner';
import BlockTwoColumns from './landing-blocks/BlockTwoColumns';

export default function LandingBlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero':            return <BlockHero block={block} />;
    case 'text_with_title': return <BlockTextWithTitle block={block} />;
    case 'image':           return <BlockImage block={block} />;
    case 'gallery':         return <BlockGallery block={block} />;
    case 'cta':             return <BlockCTA block={block} />;
    case 'spacer':          return <BlockSpacer block={block} />;
    case 'banner':          return <BlockBanner block={block} />;
    case 'two_columns':     return <BlockTwoColumns block={block} />;
    default:                return null;
  }
}
