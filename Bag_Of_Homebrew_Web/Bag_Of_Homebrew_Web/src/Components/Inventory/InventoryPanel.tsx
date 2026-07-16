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
}

export function InventoryPanel({ items, onCreateItem, onEquip }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
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
      <button className="inventory-panel__create-btn" onClick={() => setShowCreateModal(true)}>
        + Create Item
      </button>

      {selectedItem && (
        <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <InventoryGrid
        items={filteredItems}
        selectedItemId={selectedItem?.id ?? null}
        onSelect={setSelectedItem}
        onContextMenu={(item, x, y) => setContextMenu({ item, x, y })}
      />

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