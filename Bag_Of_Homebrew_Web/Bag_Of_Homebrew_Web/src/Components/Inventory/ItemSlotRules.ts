import type { Item, SlotType } from '../../Types/model';

const WEAPON_SLOTS: SlotType[] = ['WeaponSet1Main', 'WeaponSet1Off', 'WeaponSet2Main', 'WeaponSet2Off'];
const ACCESSORY_SLOTS: SlotType[] = ['Accessory1', 'Accessory2', 'Accessory3', 'Accessory4', 'Accessory5', 'Accessory6'];

export function validSlotsFor(item: Item): SlotType[] {
  switch (item.category) {
    case 'Weapon':
      return WEAPON_SLOTS;
    case 'Accessory':
      return ACCESSORY_SLOTS;
    case 'Armour': {
      const slot = item.properties['slot'];
      switch (slot) {
        case 'Chest': return ['Chest'];
        case 'Helm': return ['Head'];
        case 'Boots': return ['Boots'];
        case 'Gloves': return ['Gloves'];
        case 'Shield': return WEAPON_SLOTS;
        default: return [];
      }
    }
    default:
      return []; // Consumable and Misc aren't equippable
  }
}

export const SLOT_LABELS: Record<SlotType, string> = {
  Head: 'Head', Chest: 'Chest', Gloves: 'Gloves', Boots: 'Boots',
  Accessory1: 'Accessory 1', Accessory2: 'Accessory 2', Accessory3: 'Accessory 3',
  Accessory4: 'Accessory 4', Accessory5: 'Accessory 5', Accessory6: 'Accessory 6',
  WeaponSet1Main: 'Set 1: Main Hand', WeaponSet1Off: 'Set 1: Off Hand',
  WeaponSet2Main: 'Set 2: Main Hand', WeaponSet2Off: 'Set 2: Off Hand',
};