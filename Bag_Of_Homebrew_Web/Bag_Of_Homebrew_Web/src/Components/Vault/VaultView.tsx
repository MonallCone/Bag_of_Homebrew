import '../../styles/VaultView.css';
import { useCallback, useEffect, useState } from 'react';
import type { Item } from '../../Types/model';
import { InventoryPanel } from '../Inventory/InventoryPanel';
import type { CreateItemPayload } from '../Inventory/CreateItemModal';
import { API_BASE } from '../../config';

interface ApiItem extends Omit<Item, 'properties'> {
  propertiesJson: string;
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

interface CharacterSummary {
  id: string;
  name: string;
  portraitUrl: string | null;
}

interface Props {
  vaultId: string;
  vaultName: string;
  characters: CharacterSummary[];
}

export function VaultView({ vaultId, vaultName, characters }: Props) {
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const loadItems = useCallback(async () => {
        const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/items`, {
        credentials: 'include',
        });
        if (res.ok) {
        const raw: ApiItem[] = await res.json();
        setItems(raw.map(toItem));
        }
    }, [vaultId]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const createItem = async (payload: CreateItemPayload) => {
        const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/items`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          throw new Error(msg || 'Create failed');
        }
        await loadItems();
    };

    const deleteItem = async (itemId: string) => {
        const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
        });
        if (res.ok) {
        if (selectedItem?.id === itemId) setSelectedItem(null);
        await loadItems();
        }
    };

    const adjustQuantity = async (itemId: string, delta: number) => {
        const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/items/${itemId}/quantity`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
        });
        if (res.ok) await loadItems();
    };

    const sendToCharacter = async (itemId: string, characterId: string) => {
        const res = await fetch(`${API_BASE}/api/vaults/${vaultId}/items/${itemId}/send-to-character`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
        });
        if (res.ok) {
        if (selectedItem?.id === itemId) setSelectedItem(null);
        await loadItems();
        }
    };

    const editItem = async (itemId: string, payload: CreateItemPayload) => {
      const res = await fetch(`${API_BASE}/api/vaults/${itemId}/items/${itemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'Update failed');
      }
      await loadItems();
    };

    const duplicateItem = async (item: Item) => {
    await createItem({
      name: `${item.name} (copy)`,
      category: item.category,
      rarity: item.rarity,
      isPlotFlagged: item.isPlotFlagged,
      isAttunement: item.isAttunement,
      homebrewDescription: item.homebrewDescription ?? '',
      propertiesJson: JSON.stringify(item.properties),
      imageUrl: item.imageUrl ?? null,
      quantity: item.quantity,
    });
  };

  return (
    <div className="vault-view">
      <h1 className="vault-view__title">{vaultName}</h1>
      <div className="vault-view__panel">
        <InventoryPanel
          items={items}
          onCreateItem={createItem}
          onDelete={deleteItem}
          onAdjustQuantity={adjustQuantity}
          selectedItem={selectedItem}
          onSelectItem={setSelectedItem}
          onEquip={undefined}
          onReturnToVault={undefined}
          sendToCharacterTargets={characters}
          onSendToCharacter={sendToCharacter} 
          onEditItem={editItem}
          onDuplicate={duplicateItem}
        />
      </div>
    </div>
  );
}