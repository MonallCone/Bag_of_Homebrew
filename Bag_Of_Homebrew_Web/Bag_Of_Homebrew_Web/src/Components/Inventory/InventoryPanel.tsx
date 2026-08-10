import { useState, useMemo } from 'react';
import type { Item, ItemCategory, SlotType } from '../../Types/model';
import { CategoryTabs } from './CategoryTabs';
import { InventoryGrid } from './InventoryGrid';
import { ItemDetailPanel } from './ItemDetailPanel';
import { CreateItemModal, type CreateItemPayload } from './CreateItemModal';
import { ItemContextMenu } from './ItemContextMenu';

type TabValue = 'All' | ItemCategory | 'PlotItems';

interface Props {
  items: Item[];
  onCreateItem: (payload: CreateItemPayload) => Promise<void>;
  onEquip: (itemId: string, slotType: SlotType) => void;
  selectedItem: Item | null;
  onSelectItem: (item: Item | null) => void;
}

export function InventoryPanel({ items, onCreateItem, onEquip, selectedItem, onSelectItem }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ item: Item; x: number; y: number } | null>(null);

  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items;
    if (activeTab === 'PlotItems') return items.filter((i) => i.isPlotFlagged);
    return items.filter((i) => i.category === activeTab);
  }, [items, activeTab]);

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

        <InventoryGrid
          items={filteredItems}
          selectedItemId={selectedItem?.id ?? null}
          onSelect={onSelectItem}
          onContextMenu={(item, x, y) => setContextMenu({ item, x, y })}
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
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}