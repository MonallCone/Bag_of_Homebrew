import type { Item, ItemRarity } from '../../Types/model';

export function rarityFrameClassFor(rarity: ItemRarity): string {
  return `rarity-frame rarity-frame--${rarity.toLowerCase()}`;
}

export function rarityFrameClass(item: Item): string {
  return rarityFrameClassFor(item.rarity);
}