import type { Item } from '../../Types/model';

export function rarityFrameClass(item: Item): string {
  return `rarity-frame rarity-frame--${item.rarity.toLowerCase()}`;
}