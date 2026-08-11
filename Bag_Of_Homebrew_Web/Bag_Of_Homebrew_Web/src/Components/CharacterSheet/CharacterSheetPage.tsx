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
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
  initialPortraitUrl: string | null;
  initialSheetUrl: string | null;
}

export function CharacterSheetPage({ characterId, characterName, initialPortraitUrl, initialSheetUrl }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<EquipmentSlotData[]>([]);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(initialSheetUrl);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setDraggedItem(item ?? null);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    setDraggedItem(null);
    if(!over) return;

    const item = items.find((i) => i.id === active.id);
    if(!item) return;

    const slotType = over.id as SlotType;
    if(validSlotsFor(item).includes(slotType)) {
      equipItem(item.id, slotType);
    }
  }

  const bySlotOrder = (order: SlotType[]): EquipmentSlotData[] =>
    order.map((t) => slots.find((s) => s.slotType === t) ?? { slotType: t, item: null });

  const equippedIds = new Set(slots.filter((s) => s.item).map((s) => s.item!.id));
  const unequippedItems = items.filter((i) => !equippedIds.has(i.id));

  const [portraitUrl, setPortraitUrl] = useState<string | null>(initialPortraitUrl);

  const handlePortraitChange = async (url: string) => {
    setPortraitUrl(url);
    await fetch(`${API_BASE}/api/characters/${characterId}/portrait`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portraitUrl: url }),
    });
  };

  const deleteItem = async (itemId: string) => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      // Clear selection if the deleted item was being viewed
      if (selectedItem?.id === itemId) setSelectedItem(null);
      await Promise.all([loadItems(), loadSlots()]);
    }
  };

  const adjustQuantity = async (itemId: string, delta: number) => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}/quantity`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    if (res.ok) await loadItems();
  };

  const handleSheetChange = async (url: string) => {
    setSheetUrl(url || null);
    await fetch(`${API_BASE}/api/characters/${characterId}/sheet`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfSheetUrl: url || null }),
    });
  };

  // A slot is a "linked off-hand" if its item also occupies the paired main hand
  const linkedOffHands = new Set<SlotType>();
  const OFF_TO_MAIN: Partial<Record<SlotType, SlotType>> = {
    WeaponSet1Off: 'WeaponSet1Main',
    WeaponSet2Off: 'WeaponSet2Main',
  };
  for (const [off, main] of Object.entries(OFF_TO_MAIN) as [SlotType, SlotType][]) {
    const offSlot = slots.find((s) => s.slotType === off);
    const mainSlot = slots.find((s) => s.slotType === main);
    if (offSlot?.item && mainSlot?.item && offSlot.item.id === mainSlot.item.id) {
      linkedOffHands.add(off);
    }
  }

  const updateItemProperties = async (itemId: string, properties: Record<string, string>) => {
  const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}/properties`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
    if (res.ok) await Promise.all([loadItems(), loadSlots()]);
  };

  const [manualAc, setManualAc] = useState(initialManualAc ?? '');

  const handleAcChange = async (value: string) => {
    setManualAc(value);
    await fetch(`${API_BASE}/api/characters/${characterId}/ac`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualAc: value }),
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="character-sheet-page">
      <BurgerMenu />
      <PdfDropzone sheetUrl={sheetUrl} onSheetChange={handleSheetChange} />

      <div className="character-sheet-page__center">
        <h1 className="character-sheet-page__name">{characterName}</h1>
        <div className="character-sheet-page__slots-row">
          <EquipmentColumn slots={bySlotOrder(ARMOUR_ORDER)} onUnequip={unequipSlot} draggedItem={draggedItem} onItemClick={setSelectedItem} />
          <CharacterPortrait
            portraitUrl={portraitUrl}
            characterName={characterName}
            onPortraitChange={handlePortraitChange}
          />
          <AccessoryColumn slots={bySlotOrder(ACCESSORY_ORDER)} onUnequip={unequipSlot} draggedItem={draggedItem} onItemClick={setSelectedItem} />
        </div>
        <WeaponRow slots={bySlotOrder(WEAPON_ORDER)} onUnequip={unequipSlot} draggedItem={draggedItem} onItemClick={setSelectedItem} />
        <div className="character-sheet-page__bottom-section" />
      </div>

      <InventoryPanel items={unequippedItems} onCreateItem={createItem} onEquip={equipItem} selectedItem={selectedItem} onSelectItem={setSelectedItem} onDelete={deleteItem} onAdjustQuantity={adjustQuantity}/>
    </div>

    <DragOverlay>
      {draggedItem && <div className="drag-preview">{draggedItem.name}</div>}
    </DragOverlay>
    </DndContext>
  );
}