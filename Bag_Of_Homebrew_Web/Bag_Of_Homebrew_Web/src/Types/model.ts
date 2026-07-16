export type ItemCategory = 'Weapon' | 'Armour' | 'Consumable' | 'Misc';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'VeryRare' | 'Legendary' | 'Artifact';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  isPlotFlagged: boolean;
  homebrewDescription?: string;
  imageUrl?: string; // new — blank/placeholder for now until item images are supported
  properties: Record<string, unknown>;
  createdAt: string;
}

export type SlotType =
  | 'Head' | 'Chest' | 'Gloves' | 'Boots'
  | 'Accessory1' | 'Accessory2' | 'Accessory3' | 'Accessory4' | 'Accessory5' | 'Accessory6'
  | 'WeaponSet1Main' | 'WeaponSet1Off'
  | 'WeaponSet2Main' | 'WeaponSet2Off';

export interface EquipmentSlotData {
  slotType: SlotType;
  item: Item | null;
}