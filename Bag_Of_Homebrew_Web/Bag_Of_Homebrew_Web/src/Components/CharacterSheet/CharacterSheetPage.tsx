import { useCallback, useEffect, useState } from 'react';
import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { EquipmentColumn } from './EquipmentColumn';
import { AccessoryColumn } from './AccessoryColumn';
import { WeaponRow } from './WeaponRow';
import { CharacterPortrait } from './CharacterPortrait';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import { PdfDropzone } from '../PdfDropZone/PdfDropzone';
import { BurgerMenu } from '../Nav/BurgerMenu';
import type { CreateItemPayload } from '../Inventory/CreateItemModal';
import type { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { validSlotsFor } from '../Inventory/ItemSlotRules';

const API_BASE = 'https://localhost:7238';

interface ApiItem extends Omit<Item, 'properties'> {
  propertiesJson: string;
}

interface ApiSlot {
  slotType: SlotType;
  item: ApiItem | null;
}

function toItem(raw: ApiItem): Item {
  let properties: Record<string, unknown> = {};
  try {
    properties = JSON.parse(raw.propertiesJson);
  } catch {
    // leave empty if malformed
  }
  return { ...raw, properties };
}

const ARMOUR_ORDER: SlotType[] = ['Head', 'Chest', 'Gloves', 'Boots'];
const ACCESSORY_ORDER: SlotType[] = ['Accessory1', 'Accessory2', 'Accessory3', 'Accessory4', 'Accessory5', 'Accessory6'];
const WEAPON_ORDER: SlotType[] = ['WeaponSet1Main', 'WeaponSet1Off', 'WeaponSet2Main', 'WeaponSet2Off'];

interface Props {
  characterId: string;
  characterName: string;
}

export function CharacterSheetPage({ characterId, characterName }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<EquipmentSlotData[]>([]);

  const loadItems = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items`, {
      credentials: 'include',
    });
    if (res.ok) {
      const raw: ApiItem[] = await res.json();
      setItems(raw.map(toItem));
    }
  }, [characterId]);

  const loadSlots = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/slots`, {
      credentials: 'include',
    });
    if (res.ok) {
      const raw: ApiSlot[] = await res.json();
      setSlots(raw.map((s) => ({ slotType: s.slotType, item: s.item ? toItem(s.item) : null })));
    }
  }, [characterId]);

  useEffect(() => {
    loadItems();
    loadSlots();
  }, [loadItems, loadSlots]);

  const createItem = async (payload: CreateItemPayload) => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Create failed');
    await loadItems();
  };

  const equipItem = async (itemId: string, slotType: SlotType) => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/equip`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, slotType }),
    });
    if (res.ok) {
      await Promise.all([loadItems(), loadSlots()]);
    }
  };

  const unequipSlot = async (slotType: SlotType) => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/unequip`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotType }),
    });
    if (res.ok) {
      await Promise.all([loadItems(), loadSlots()]);
    }
  };

  const bySlotOrder = (order: SlotType[]): EquipmentSlotData[] =>
    order.map((t) => slots.find((s) => s.slotType === t) ?? { slotType: t, item: null });

  const equippedIds = new Set(slots.filter((s) => s.item).map((s) => s.item!.id));
  const unequippedItems = items.filter((i) => !equippedIds.has(i.id));

  return (
    <div className="character-sheet-page">
      <BurgerMenu />
      <PdfDropzone />

      <div className="character-sheet-page__center">
        <h1 className="character-sheet-page__name">{characterName}</h1>
        <div className="character-sheet-page__slots-row">
          <EquipmentColumn slots={bySlotOrder(ARMOUR_ORDER)} onUnequip={unequipSlot} />
          <CharacterPortrait characterName={characterName} />
          <AccessoryColumn slots={bySlotOrder(ACCESSORY_ORDER)} onUnequip={unequipSlot} />
        </div>
        <WeaponRow slots={bySlotOrder(WEAPON_ORDER)} onUnequip={unequipSlot} />
      </div>

      <InventoryPanel items={unequippedItems} onCreateItem={createItem} onEquip={equipItem} />
    </div>
  );
}