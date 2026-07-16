import type { EquipmentSlotData, Item } from '../../Types/model';
import { EquipmentColumn } from './EquipmentColumn';
import { AccessoryColumn } from './AccessoryColumn';
import { WeaponRow } from './WeaponRow';
import { CharacterPortrait } from './CharacterPortrait';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import { PdfDropzone } from '../PdfDropZone/PdfDropzone';
import { BurgerMenu } from '../Nav/BurgerMenu';

// Temporary mock data — replace with real API data once endpoints are wired up
const emptySlot = (slotType: EquipmentSlotData['slotType']): EquipmentSlotData => ({
  slotType,
  item: null,
});

const armourSlots: EquipmentSlotData[] = ['Head', 'Chest', 'Gloves', 'Boots'].map(
  (s) => emptySlot(s as EquipmentSlotData['slotType'])
);
const accessorySlots: EquipmentSlotData[] = [
  'Accessory1', 'Accessory2', 'Accessory3', 'Accessory4', 'Accessory5', 'Accessory6',
].map((s) => emptySlot(s as EquipmentSlotData['slotType']));
const weaponSlots: EquipmentSlotData[] = [
  'WeaponSet1Main', 'WeaponSet1Off', 'WeaponSet2Main', 'WeaponSet2Off',
].map((s) => emptySlot(s as EquipmentSlotData['slotType']));

const mockItems: Item[] = [
  {
    id: '1',
    name: 'Rusty Longsword',
    category: 'Weapon',
    rarity: 'Common',
    isPlotFlagged: false,
    properties: { damage: '1d8' },
    createdAt: new Date().toISOString(),
  },
];

interface Props {
  characterName: string;
}

export function CharacterSheetPage({ characterName }: Props) {
  return (
    <div className="character-sheet-page">
      <BurgerMenu />
      <PdfDropzone />

      <div className="character-sheet-page__center">
        <h1 className="character-sheet-page__name">{characterName}</h1>
        <div className="character-sheet-page__slots-row">
          <EquipmentColumn slots={armourSlots} />
          <CharacterPortrait characterName={characterName} />
          <AccessoryColumn slots={accessorySlots} />
        </div>
        <WeaponRow slots={weaponSlots} />
      </div>

      <InventoryPanel items={mockItems} />
    </div>
  );
}