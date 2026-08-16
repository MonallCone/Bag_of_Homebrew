import { useCallback, useEffect, useState } from 'react';
import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { EquipmentColumn } from './EquipmentColumn';
import { AccessoryColumn } from './AccessoryColumn';
import { WeaponRow } from './WeaponRow';
import { CharacterPortrait } from './CharacterPortrait';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import { PdfDropzone } from '../PdfDropZone/PdfDropzone';
import type { CreateItemPayload } from '../Inventory/CreateItemModal';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { validSlotsFor } from '../Inventory/ItemSlotRules';
import { WeaponSummary } from './WeaponSummary';
import { AcShield } from './AcShield';
import { type ApiItem, toItem } from '../../api/item';
import { HealthHeart } from './HealthHeart';
import type { CurrencyAmounts } from '../Inventory/coins';

const API_BASE = 'https://localhost:7238';

interface ApiSlot {
  slotType: SlotType;
  item: ApiItem | null;
}

const ARMOUR_ORDER: SlotType[] = ['Head', 'Chest', 'Gloves', 'Boots'];
const ACCESSORY_ORDER: SlotType[] = ['Accessory1', 'Accessory2', 'Accessory3', 'Accessory4', 'Accessory5', 'Accessory6'];
const WEAPON_ORDER: SlotType[] = ['WeaponSet1Main', 'WeaponSet1Off', 'WeaponSet2Main', 'WeaponSet2Off'];

interface CampaignContext {
  campaignId: string;
  campaignVaultId: string;
  memberUserId?: string;
  giftTargets?: { userId: string; name: string }[];
  incoming?: { transferId: string; fromUserId: string; item: ApiItem }[];
  outgoing?: { transferId: string; itemId: string; toUserId: string }[];
  onTransfersChanged?: () => void;
}

interface Props {
  characterId: string;
  vaultId: string;          
  campaign?: CampaignContext;    
  readOnly?: boolean;          
}

export function CharacterSheetPage({ characterId, vaultId, campaign, readOnly = false }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<EquipmentSlotData[]>([]);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [manualAc, setManualAc] = useState('');
  const [currentHp, setCurrentHp] = useState<number | null>(null);
  const [maxHp, setMaxHp] = useState<number | null>(null);
  const [tempHp, setTempHp] = useState<number | null>(null);
  const [currency, setCurrency] = useState<CurrencyAmounts>({
    platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0,
  });

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

  const loadCharacter = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/characters/${characterId}`, { credentials: 'include' });
    if (res.ok) {
      const c = await res.json();
      setCharacterName(c.name);
      setPortraitUrl(c.portraitUrl);
      setSheetUrl(c.pdfSheetUrl);
      setManualAc(c.manualAc ?? '');
      setCurrentHp(c.currentHp);
      setMaxHp(c.maxHp);
      setTempHp(c.tempHp);
      setCurrency({platinum: c.platinum, gold: c.gold, electrum: c.electrum, silver: c.silver, copper: c.copper});
    }
  }, [characterId]);

  const createItem = async (payload: CreateItemPayload) => {
    if (readOnly) return;
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Create failed');
    await loadItems();
  };

  const equipItem = async (itemId: string, slotType: SlotType, twoHanded = false) => {
    if (readOnly) return;
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/equip`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, slotType, twoHanded }),
    });
    if (res.ok) await Promise.all([loadItems(), loadSlots()]);
  };

  const unequipSlot = async (slotType: SlotType) => {
    if (readOnly) return;
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
    if (readOnly) return;
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


  const handlePortraitChange = async (url: string) => {
    if (readOnly) return;
    setPortraitUrl(url);
    await fetch(`${API_BASE}/api/characters/${characterId}/portrait`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portraitUrl: url }),
    });
  };

  const deleteItem = async (itemId: string) => {
    if (readOnly) return;
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
    if (readOnly) return;
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}/quantity`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    if (res.ok) await loadItems();
  };

  const handleSheetChange = async (url: string) => {
    if (readOnly) return;
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
    if (readOnly) return;
    const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}/properties`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      });
      if (res.ok) await Promise.all([loadItems(), loadSlots()]);
  };

  const handleAcChange = async (value: string) => {
    if (readOnly) return;
    setManualAc(value);
    await fetch(`${API_BASE}/api/characters/${characterId}/ac`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualAc: value }),
    });
  };

const returnToVault = async (itemId: string) => {
    if (readOnly) return;

    const url = campaign
      ? `${API_BASE}/api/campaigns/${campaign.campaignId}/return-to-vault`
      : `${API_BASE}/api/characters/${characterId}/items/${itemId}/return-to-vault`;

    const body = campaign
      ? JSON.stringify({ itemId })
      : JSON.stringify({ vaultId });

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) {
      if (selectedItem?.id === itemId) setSelectedItem(null);
      await Promise.all([loadItems(), loadSlots()]);
    }
  };

  const loadEverything = useCallback(async () => {
  if (readOnly && campaign?.memberUserId) {
    // Load another player's character via the campaign read endpoint (single call returns all)
    const res = await fetch(
      `${API_BASE}/api/campaigns/${campaign.campaignId}/members/${campaign.memberUserId}/character`,
      { credentials: 'include' }
    );
    if (res.ok) {
      const d = await res.json();
      setCharacterName(d.name);
      setPortraitUrl(d.portraitUrl);
      setSheetUrl(d.pdfSheetUrl);
      setManualAc(d.manualAc ?? '');
      setItems((d.items as ApiItem[]).map(toItem));
      setSlots((d.slots as ApiSlot[]).map((s) => ({ slotType: s.slotType, item: s.item ? toItem(s.item) : null })));
      setCurrentHp(d.currentHp);
      setMaxHp(d.maxHp);
      setTempHp(d.tempHp);
      setCurrency({platinum: d.platinum, gold: d.gold, electrum: d.electrum, silver: d.silver, copper: d.copper});
    }
  } else {
    // Own character — the existing separate loaders
    await Promise.all([loadCharacter(), loadItems(), loadSlots()]);
  }
}, [readOnly, campaign, loadCharacter, loadItems, loadSlots]);

useEffect(() => { loadEverything(); }, [loadEverything]);

  const giftItem = async (itemId: string, toUserId: string) => {
    if (!campaign) return;
    const res = await fetch(`${API_BASE}/api/campaigns/${campaign.campaignId}/gift`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, toUserId }),
    });
    if (res.ok) { await loadItems(); campaign.onTransfersChanged?.(); }
  };

  const acceptTransfer = async (transferId: string) => {
    if (!campaign) return;
    const res = await fetch(`${API_BASE}/api/campaigns/${campaign.campaignId}/transfers/${transferId}/accept`, {
      method: 'POST', credentials: 'include',
    });
    if (res.ok) { await loadItems(); campaign.onTransfersChanged?.(); }
  };

  const rejectTransfer = async (transferId: string) => {
    if (!campaign) return;
    const res = await fetch(`${API_BASE}/api/campaigns/${campaign.campaignId}/transfers/${transferId}/reject`, {
      method: 'POST', credentials: 'include',
    });
    if (res.ok) { await loadItems(); campaign.onTransfersChanged?.(); }
  };

  // Set of item ids the player has offered out (still pending)
  const outgoingItemIds = new Set((campaign?.outgoing ?? []).map((o) => o.itemId));

  // Incoming gifts become pseudo-items flagged as pending-incoming
  const incomingItems = (campaign?.incoming ?? []).map((t) => ({
    ...toItem(t.item),
    __pendingIncoming: t.transferId,   // marker fields
  }));

  // Real unequipped items, flagged if outgoing-pending
  const ownItems = unequippedItems.map((i) =>
    outgoingItemIds.has(i.id) ? { ...i, __pendingOutgoing: true } : i
  );

  const displayItems = [...ownItems, ...incomingItems];

  const handleHealthChange = async (c: number | null, m: number | null, t: number | null) => {
  if (readOnly) return;
    setCurrentHp(c); setMaxHp(m); setTempHp(t);
    await fetch(`${API_BASE}/api/characters/${characterId}/health`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentHp: c, maxHp: m, tempHp: t }),
    });
  };

  const handleCurrencyChange = async (next: CurrencyAmounts) => {
    if (readOnly) return;
    setCurrency(next);
    await fetch(`${API_BASE}/api/characters/${characterId}/currency`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="character-sheet-page">
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
        <HealthHeart currentHp={currentHp} maxHp={maxHp} tempHp={tempHp} readOnly={readOnly} onChange={handleHealthChange}/>
        <AcShield slots={slots} manualAc={manualAc} onManualAcChange={handleAcChange} />
        <WeaponRow slots={bySlotOrder(WEAPON_ORDER)} onUnequip={unequipSlot} draggedItem={draggedItem} onItemClick={setSelectedItem} linkedOffHands={linkedOffHands}/>
        <div className="character-sheet-page__bottom-section">
        <WeaponSummary
          slots={slots}
          linkedOffHands={linkedOffHands}
          onUpdateProperties={updateItemProperties}
        />
      </div>
      </div>

      <InventoryPanel
        items={displayItems}
        selectedItem={selectedItem}
        onSelectItem={setSelectedItem}
        onCreateItem={readOnly ? undefined : createItem}
        onDelete={readOnly ? undefined : deleteItem}
        onAdjustQuantity={readOnly ? undefined : adjustQuantity}
        onEquip={readOnly ? undefined : equipItem}
        onReturnToVault={readOnly ? undefined : returnToVault}
        inCampaign={!!campaign}
        onGift={readOnly ? undefined : giftItem}
        onAcceptTransfer={readOnly ? undefined : acceptTransfer}
        onRejectTransfer={readOnly ? undefined : rejectTransfer}
        giftTargets={campaign?.giftTargets}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        currencyReadOnly={readOnly}
      />
    </div>

    <DragOverlay>
      {draggedItem && <div className="drag-preview">{draggedItem.name}</div>}
    </DragOverlay>
    </DndContext>
  );
}