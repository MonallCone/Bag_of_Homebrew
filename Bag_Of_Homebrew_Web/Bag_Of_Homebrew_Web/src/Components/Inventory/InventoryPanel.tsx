import { useState, useMemo } from 'react';
import type { Item, ItemCategory, SlotType } from '../../Types/model';
import { CategoryTabs } from './CategoryTabs';
import { InventoryGrid } from './InventoryGrid';
import { ItemDetailPanel } from './ItemDetailPanel';
import { CreateItemModal, type CreateItemPayload } from './CreateItemModal';
import { ItemContextMenu } from './ItemContextMenu';
import { type SortOption, SORT_LABELS, sortItems } from './sortOptions';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import type { CurrencyAmounts } from './coins';
import { CurrencyBar } from './CurrencyBar';
import type { ItemUsage } from '../../api/itemUsage';
import { ItemUsageIndicator } from './ItemUsageIndicator';

type TabValue = 'All' | ItemCategory | 'PlotItems';

interface Props {
  items: Item[];
  onCreateItem?: (payload: CreateItemPayload) => Promise<void>;
  onDelete?: (itemId: string) => void;                            
  onAdjustQuantity?: (itemId: string, delta: number) => void;  
  selectedItem: Item | null;
  onSelectItem: (item: Item | null) => void;
  onEquip?: (itemId: string, slotType: SlotType, twoHanded?: boolean) => void;
  onReturnToVault?: (itemId: string) => void;
  sendToCharacterTargets?: { id: string; name: string }[];
  onSendToCharacter?: (itemId: string, characterId: string) => void;
  inCampaign?: boolean;
  giftTargets?: { userId: string; name: string }[];
  onGift?: (itemId: string, toUserId: string) => void;
  onAcceptTransfer?: (transferId: string) => void;
  onRejectTransfer?: (transferId: string) => void;
  currency?: CurrencyAmounts;
  onCurrencyChange?: (amounts: CurrencyAmounts) => void;
  currencyReadOnly?: boolean;
  itemUsage?: ItemUsage | null;
}

export function InventoryPanel({ items, onCreateItem, onEquip, selectedItem, onSelectItem, onDelete, onAdjustQuantity, onReturnToVault, sendToCharacterTargets, onSendToCharacter, inCampaign = false, giftTargets, onGift, onAcceptTransfer, onRejectTransfer, currency, onCurrencyChange, currencyReadOnly, itemUsage }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ item: Item; x: number; y: number } | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);

  const visibleItems = useMemo(() => {
    let list = items;
    if (activeTab === 'PlotItems') list = items.filter((i) => i.isPlotFlagged);
    else if (activeTab !== 'All') list = items.filter((i) => i.category === activeTab);
    return sortItems(list, sort);
  }, [items, activeTab, sort]);

 return (
    <div className="inventory-panel">
      <CategoryTabs active={activeTab} onChange={setActiveTab} />

      <div className="inventory-folder-body">
        {onCreateItem && (
          <button className="inventory-panel__create-btn" onClick={() => setShowCreateModal(true)}>
            + Create Item
          </button>
        )}

        {selectedItem && (
          <ItemDetailPanel item={selectedItem} onClose={() => onSelectItem(null)} />
        )}

        <div className="inventory-toolbar">
          {currency && onCurrencyChange && (
            <CurrencyBar amounts={currency} readOnly={currencyReadOnly} onChange={onCurrencyChange} />
          )}
          {itemUsage && <ItemUsageIndicator usage={itemUsage} />}
          <div className="sort-bar">
            <label className="sort-bar__label">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <option key={key} value={key}>{SORT_LABELS[key]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <InventoryGrid
          items={visibleItems}
          selectedItemId={selectedItem?.id ?? null}
          onSelect={onSelectItem}
          onContextMenu={(item, x, y) => setContextMenu({ item, x, y })}
          onAdjustQuantity={onAdjustQuantity}
        />
      </div>

      {showCreateModal && onCreateItem && (
        <CreateItemModal onClose={() => setShowCreateModal(false)} onCreate={onCreateItem} />
      )}

      {contextMenu && (
        <ItemContextMenu
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onEquip={onEquip}
          onReturnToVault={onReturnToVault}
          onDeleteRequest={(item) => setPendingDelete(item)}
          onAdjustQuantity={onAdjustQuantity}
          sendToCharacterTargets={sendToCharacterTargets}
          onSendToCharacter={onSendToCharacter}
          onClose={() => setContextMenu(null)}
          inCampaign={inCampaign}
          giftTargets={giftTargets}
          onGift={onGift}
          onAcceptTransfer={onAcceptTransfer}
          onRejectTransfer={onRejectTransfer}
        />
      )}

      {pendingDelete && onDelete && (
        <ConfirmDeleteModal
          item={pendingDelete}
          onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}