import { useState } from 'react';
import type { ItemCategory, ItemRarity } from '../../Types/model';

const RARITIES: ItemRarity[] = ['Common', 'Uncommon', 'Rare', 'VeryRare', 'Legendary', 'Artifact'];
const CATEGORIES: ItemCategory[] = ['Weapon', 'Armour', "Accessory", 'Consumable', 'Misc'];
const ARMOUR_SLOTS = ['Chest', 'Helm', 'Boots', 'Gloves', 'Shield'];

export interface CreateItemPayload {
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  isPlotFlagged: boolean;
  homebrewDescription: string;
  propertiesJson: string;
}

interface Props {
  onClose: () => void;
  onCreate: (payload: CreateItemPayload) => Promise<void>;
}

export function CreateItemModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Weapon');
  const [rarity, setRarity] = useState<ItemRarity>('Common');
  const [isPlotFlagged, setIsPlotFlagged] = useState(false);
  const [homebrewDescription, setHomebrewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category-specific fields
  const [damage, setDamage] = useState('');
  const [weaponProperties, setWeaponProperties] = useState('');
  const [armourSlot, setArmourSlot] = useState('Chest');
  const [acValue, setAcValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [effect, setEffect] = useState('');

  const buildProperties = (): Record<string, unknown> => {
    switch (category) {
      case 'Weapon':
        return { damage, properties: weaponProperties };
      case 'Armour': {
        const props: Record<string, unknown> = { slot: armourSlot };
        if (armourSlot === 'Chest' || armourSlot === 'Shield') props.ac = acValue;
        return props;
      }
      case 'Consumable':
        return { quantity: Number(quantity) || 1, effect };
      case 'Accessory':
      case 'Misc':
        return {};
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        category,
        rarity,
        isPlotFlagged,
        homebrewDescription,
        propertiesJson: JSON.stringify(buildProperties()),
      });
      onClose();
    } catch {
      setError('Could not save the item. Check the API is running and try again.');
      setSaving(false);
    }
  };

  const showAc = category === 'Armour' && (armourSlot === 'Chest' || armourSlot === 'Shield');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Create Item</h2>

        <label className="modal__field">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="modal__field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flametongue Dagger" />
        </label>

        <label className="modal__field">
          Rarity
          <select value={rarity} onChange={(e) => setRarity(e.target.value as ItemRarity)}>
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r === 'VeryRare' ? 'Very Rare' : r}</option>
            ))}
          </select>
        </label>

        {category === 'Weapon' && (
          <>
            <label className="modal__field">
              Damage
              <input value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="e.g. 1d8 slashing" />
            </label>
            <label className="modal__field">
              Properties
              <input value={weaponProperties} onChange={(e) => setWeaponProperties(e.target.value)} placeholder="e.g. finesse, light" />
            </label>
          </>
        )}

        {category === 'Armour' && (
          <>
            <label className="modal__field">
              Armour slot
              <select value={armourSlot} onChange={(e) => setArmourSlot(e.target.value)}>
                {ARMOUR_SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {showAc && (
              <label className="modal__field">
                AC
                <input value={acValue} onChange={(e) => setAcValue(e.target.value)} placeholder="e.g. 14 or +2" />
              </label>
            )}
          </>
        )}

        {category === 'Consumable' && (
          <>
            <label className="modal__field">
              Quantity
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <label className="modal__field">
              Effect
              <textarea value={effect} onChange={(e) => setEffect(e.target.value)} rows={2} placeholder="e.g. Restores 2d4+2 HP" />
            </label>
          </>
        )}

        <label className="modal__field">
          Abilities / description (homebrew)
          <textarea
            value={homebrewDescription}
            onChange={(e) => setHomebrewDescription(e.target.value)}
            rows={3}
            placeholder="Freeform abilities, lore, or notes"
          />
        </label>

        <label className="modal__checkbox">
          <input
            type="checkbox"
            checked={isPlotFlagged}
            onChange={(e) => setIsPlotFlagged(e.target.checked)}
          />
          Plot item
        </label>

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Create item'}
          </button>
        </div>
      </div>
    </div>
  );
}