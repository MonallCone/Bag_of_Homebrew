import { useState, useMemo } from 'react';
import type { Item, ItemCategory } from '../../Types/model';
import { CategoryTabs } from './CategoryTabs';
import { InventoryGrid } from './InventoryGrid';
import { ItemDetailPanel } from './ItemDetailPanel';

type TabValue = 'All' | ItemCategory | 'PlotItems';

interface Props {
  items: Item[];
}

export function InventoryPanel({ items }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>('All');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const filteredItems = useMemo(() => {
    if (activeTab === 'All') return items;
    if (activeTab === 'PlotItems') return items.filter((i) => i.isPlotFlagged);
    return items.filter((i) => i.category === activeTab);
  }, [items, activeTab]);

  return (
    <div className="inventory-panel">
      <CategoryTabs active={activeTab} onChange={setActiveTab} />
      <button className="inventory-panel__create-btn">+ Create Item</button>

      {selectedItem && (
        <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <InventoryGrid
        items={filteredItems}
        selectedItemId={selectedItem?.id ?? null}
        onSelect={setSelectedItem}
      />
    </div>
  );
}