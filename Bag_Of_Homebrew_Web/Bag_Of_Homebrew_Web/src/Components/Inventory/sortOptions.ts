import type { Item } from '../../Types/model';

export type SortOption = 'name-asc' | 'name-desc' | 'rarity-desc' | 'rarity-asc' | 'newest' | 'oldest';

export const SORT_LABELS: Record<SortOption, string> = {
  'name-asc': 'Name A–Z',
  'name-desc': 'Name Z–A',
  'rarity-desc': 'Rarity (high → low)',
  'rarity-asc': 'Rarity (low → high)',
  'newest': 'Newest first',
  'oldest': 'Oldest first',
};

// Rarity string → sortable rank
const RARITY_RANK: Record<string, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  VeryRare: 3,
  Legendary: 4,
  Artifact: 5,
};

export function sortItems(items: Item[], sort: SortOption): Item[] {
  const sorted = [...items]; // never mutate the source array
  switch (sort) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'rarity-desc':
      return sorted.sort((a, b) =>
        (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) || a.name.localeCompare(b.name));
    case 'rarity-asc':
      return sorted.sort((a, b) =>
        (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0) || a.name.localeCompare(b.name));
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}