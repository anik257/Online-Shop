import type { Category } from '../types'

export const PLACEHOLDER_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Ethnic & Festive',
    slug: 'ethnic-festive',
    description: 'Traditional Panjabis, Kurtis, and festive ensembles tailored for celebrations.',
    itemCount: 48,
    featured: true,
  },
  {
    id: 'cat-2',
    name: 'Modern Streetwear',
    slug: 'modern-streetwear',
    description: 'Oversized tees, drop-shoulder hoodies, cargo pants, and urban essentials.',
    itemCount: 64,
    featured: true,
  },
  {
    id: 'cat-3',
    name: 'Casual & Everyday',
    slug: 'casual-everyday',
    description: 'Breathable cotton polos, linen shirts, and relaxed fits for day-to-day comfort.',
    itemCount: 52,
    featured: true,
  },
  {
    id: 'cat-4',
    name: 'Denim & Trousers',
    slug: 'denim-trousers',
    description: 'Slim-fit jeans, relaxed denims, chinos, and tailored formal trousers.',
    itemCount: 36,
    featured: false,
  },
  {
    id: 'cat-5',
    name: 'Women’s Contemporary',
    slug: 'womens-contemporary',
    description: 'Modern silhouettes, fusion tops, modest fashion, and elegant workwear.',
    itemCount: 59,
    featured: true,
  },
  {
    id: 'cat-6',
    name: 'Accessories & Lifestyle',
    slug: 'accessories',
    description: 'Leather belts, minimalist wallets, caps, tote bags, and everyday accents.',
    itemCount: 28,
    featured: false,
  },
]
