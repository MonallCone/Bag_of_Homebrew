export type ItemCategory = 'Weapon' | 'Armour' | "Accessory" | 'Consumable' | 'Misc';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'VeryRare' | 'Legendary' | 'Artifact';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  isPlotFlagged: boolean;
  homebrewDescription?: string;
  imageUrl?: string;
  properties: Record<string, unknown>;
  createdAt: string;
  quantity?: number;
  __pendingIncoming?: string;   // transferId if this is an incoming gift awaiting accept/reject
  __pendingOutgoing?: boolean;  // true if this item is offered out, awaiting recipient
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