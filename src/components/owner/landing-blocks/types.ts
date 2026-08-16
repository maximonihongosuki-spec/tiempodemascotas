export type BlockType =
  | 'hero'
  | 'text_with_title'
  | 'image'
  | 'gallery'
  | 'cta'
  | 'spacer'
  | 'banner'
  | 'two_columns';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  image_url: string;
  title: string;
  subtitle: string;
  cta_text?: string;
  cta_url?: string;
}

export interface TextWithTitleBlock extends BaseBlock {
  type: 'text_with_title';
  title: string;
  text: string;
  size: 'sm' | 'md' | 'lg';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  image_url: string;
  alt: string;
  width: 'contained' | 'full';
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  images: Array<{ url: string; alt: string }>;
}

export interface CtaBlock extends BaseBlock {
  type: 'cta';
  text: string;
  url: string;
  style: 'primary' | 'secondary';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  size: 'sm' | 'md' | 'lg';
}

export interface BannerBlock extends BaseBlock {
  type: 'banner';
  image_url: string;
  alt: string;
  link_url?: string;
}

export interface TwoColumnsBlock extends BaseBlock {
  type: 'two_columns';
  image_url: string;
  alt: string;
  title: string;
  text: string;
  image_side: 'left' | 'right';
}

export type Block =
  | HeroBlock
  | TextWithTitleBlock
  | ImageBlock
  | GalleryBlock
  | CtaBlock
  | SpacerBlock
  | BannerBlock
  | TwoColumnsBlock;
