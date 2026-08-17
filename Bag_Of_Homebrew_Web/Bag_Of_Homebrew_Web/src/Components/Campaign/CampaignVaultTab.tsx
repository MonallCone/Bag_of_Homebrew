import { useCallback, useEffect, useState } from 'react';
import type { Item } from '../../Types/model';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import type { CreateItemPayload } from '../Inventory/CreateItemModal';
import { type ApiItem, toItem } from '../../api/item';
import { useToast } from '../Toast/ToastProvider';
import { API_BASE } from '../../config';

interface Player { userId: string; characterName: string | null; userName: string; }

interface Props {
  campaignId: string;
  isGm: boolean;
  players: Player[];
}

export function CampaignVaultTab({ campaignId, isGm, players = []}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { showToast } = useToast();

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

  const sendToCharacter = async (itemId: string, toUserId: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/vault/items/${itemId}/send-to-character`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    });
    if (res.ok) {
      if (selectedItem?.id === itemId) setSelectedItem(null);
      await loadItems();
    } else {
      const msg = await res.text().catch(() => '');
      showToast(msg || 'Could not send the item.', 'error');
    }
  };

  return (
    <div className="campaign-vault-tab">
      <InventoryPanel
        items={items}
        selectedItem={selectedItem}
        onSelectItem={setSelectedItem}
        onCreateItem={isGm ? createItem : undefined}
        onDelete={isGm ? deleteItem : undefined}
        onAdjustQuantity={isGm ? (async () => {}) : undefined}
        onEquip={undefined}
        onReturnToVault={undefined}
        sendToCharacterTargets={isGm ? players.map((p) => ({ id: p.userId, name: p.characterName ?? p.userName })) : undefined}
        onSendToCharacter={isGm ? sendToCharacter : undefined}
      />
    </div>
  );
}