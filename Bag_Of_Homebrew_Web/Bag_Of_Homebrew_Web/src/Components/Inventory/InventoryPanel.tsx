import { useState, useMemo } from 'react';
import type { Item, ItemCategory, SlotType } from '../../Types/model';
import { CategoryTabs } from './CategoryTabs';
import { InventoryGrid } from './InventoryGrid';
import { ItemDetailPanel } from './ItemDetailPanel';
import { CreateItemModal, type CreateItemPayload } from './CreateItemModal';
import { ItemContextMenu } from './ItemContextMenu';
import { type SortOption, SORT_LABELS, sortItems } from './sortOptions';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

type TabValue = 'All' | ItemCategory | 'PlotItems';

interface Props {
  items: Item[];
  onCreateItem: (payload: CreateItemPayload) => Promise<void>;
  onEquip: (itemId: string, slotType: SlotType) => void;
  selectedItem: Item | null;
  onSelectItem: (item: Item | null) => void;
  onDelete: (itemId: string) => void;
  onAdjustQuantity: (itemId: string, delta: number) => void;
}

export function InventoryPanel({ items, onCreateItem, onEquip, selectedItem, onSelectItem, onDelete, onAdjustQuantity }: Props) {
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
        <button className="inventory-panel__create-btn" onClick={() => setShowCreateModal(true)}>
          + Create Item
        </button>

        {selectedItem && (
          <ItemDetailPanel item={selectedItem} onClose={() => onSelectItem(null)} />
        )}

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

        <InventoryGrid
          items={visibleItems}
          selectedItemId={selectedItem?.id ?? null}
          onSelect={onSelectItem}
          onContextMenu={(item, x, y) => setContextMenu({ item, x, y })}
          onAdjustQuantity={onAdjustQuantity}
        />
      </div>

      {showCreateModal && (
        <CreateItemModal onClose={() => setShowCreateModal(false)} onCreate={onCreateItem} />
      )}

      {contextMenu && (
        <ItemContextMenu
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onEquip={onEquip}
          onDeleteRequest={(item) => setPendingDelete(item)}
          onClose={() => setContextMenu(null)}
          onAdjustQuantity={onAdjustQuantity}
        />
      )}

      // render the confirm modal:
      {pendingDelete && (
        <ConfirmDeleteModal
          item={pendingDelete}
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}