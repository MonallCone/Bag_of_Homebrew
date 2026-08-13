import { useCallback, useEffect, useState } from 'react';
import type { Item } from '../../Types/model';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import type { CreateItemPayload } from '../Inventory/CreateItemModal';

const API_BASE = 'https://localhost:7238';

interface ApiItem extends Omit<Item, 'properties'> { propertiesJson: string; }
function toItem(raw: ApiItem): Item {
  let properties: Record<string, unknown> = {};
  try { properties = JSON.parse(raw.propertiesJson); } catch { /* */ }
  return { ...raw, properties };
}

interface Props {
  campaignId: string;
  isGm: boolean;
}

export function CampaignVaultTab({ campaignId, isGm }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/vault/items`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setItems((data.items as ApiItem[]).map(toItem));
    }
  }, [campaignId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const createItem = async (payload: CreateItemPayload) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/vault/items`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Create failed');
    await loadItems();
  };

  const deleteItem = async (itemId: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/vault/items/${itemId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) { if (selectedItem?.id === itemId) setSelectedItem(null); await loadItems(); }
  };

  return (
    <div className="campaign-vault-tab">
      <InventoryPanel
        items={items}
        selectedItem={selectedItem}
        onSelectItem={setSelectedItem}
        // GM gets create/delete; players get neither (view-only)
        onCreateItem={isGm ? createItem : undefined}
        onDelete={isGm ? deleteItem : undefined}
        onAdjustQuantity={isGm ? (async () => {}) : undefined}
        onEquip={undefined}
        onReturnToVault={undefined}
      />
    </div>
  );
}