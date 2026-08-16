import type { SpacerBlock } from './types';

const heightMap = { sm: 'h-8', md: 'h-16', lg: 'h-24' };

export default function BlockSpacer({ block }: { block: SpacerBlock }) {
  return <div className={heightMap[block.size] ?? 'h-16'} aria-hidden="true" />;
}
