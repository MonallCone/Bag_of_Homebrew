import { useState } from 'react';
import type { Item, ItemCategory, ItemRarity } from '../../Types/model';
import { ImagePicker } from './ImagePicker';
import type { CreateItemPayload } from './CreateItemModal';

const RARITIES: ItemRarity[] = ['Common', 'Uncommon', 'Rare', 'VeryRare', 'Legendary', 'Artifact'];
const CATEGORIES: ItemCategory[] = ['Weapon', 'Armour', 'Accessory', 'Consumable', 'Misc'];
const ARMOUR_SLOTS = ['Chest', 'Helm', 'Boots', 'Gloves', 'Shield'];

interface Props {
  item: Item;
  onClose: () => void;
  onSave: (itemId: string, payload: CreateItemPayload) => Promise<void>;
}

export function EditItemModal({ item, onClose, onSave }: Props) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ItemCategory>(item.category);
  const [rarity, setRarity] = useState<ItemRarity>(item.rarity);
  const [isPlotFlagged, setIsPlotFlagged] = useState(item.isPlotFlagged);
  const [isAttunement, setIsAttunement] = useState(item.isAttunement);
  const [homebrewDescription, setHomebrewDescription] = useState(item.homebrewDescription ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = item.properties;
  const [damage, setDamage] = useState((p.damage as string) ?? '');
  const [weaponProperties, setWeaponProperties] = useState((p.properties as string) ?? '');
  const [handedness, setHandedness] = useState<'OneHanded' | 'TwoHanded' | 'Versatile'>(
    (p.handedness as 'OneHanded' | 'TwoHanded' | 'Versatile') ?? 'OneHanded'
  );
  const [damageTwoHanded, setDamageTwoHanded] = useState((p.damageTwoHanded as string) ?? '');
  const [armourSlot, setArmourSlot] = useState((p.slot as string) ?? 'Chest');
  const [acValue, setAcValue] = useState((p.ac as string) ?? '');
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1));
  const [effect, setEffect] = useState((p.effect as string) ?? '');

  const buildProperties = (): Record<string, unknown> => {
    switch (category) {
      case 'Weapon': {
        const props: Record<string, unknown> = { damage, properties: weaponProperties, handedness };
        if (handedness === 'Versatile') props.damageTwoHanded = damageTwoHanded;
        return props;
      }
      case 'Armour': {
        const props: Record<string, unknown> = { slot: armourSlot };
        if (armourSlot === 'Chest' || armourSlot === 'Shield') props.ac = acValue;
        return props;
      }
      case 'Consumable':
        return { effect };
      case 'Accessory':
      case 'Misc':
        return {};
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(item.id, {
        name: name.trim(),
        category,
        rarity,
        isPlotFlagged,
        isAttunement,
        homebrewDescription,
        propertiesJson: JSON.stringify(buildProperties()),
        imageUrl,
        quantity: category === 'Consumable' ? Number(quantity) || 1 : undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the item.');
      setSaving(false);
    }
  };

  const showAc = category === 'Armour' && (armourSlot === 'Chest' || armourSlot === 'Shield');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Edit Item</h2>

        <div className="item-form__header">
          <ImagePicker value={imageUrl} onChange={setImageUrl} rarity={rarity} />

          <div className="item-form__header-fields">
            <label className="modal__field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="modal__field">
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="modal__field">
              Rarity
              <select value={rarity} onChange={(e) => setRarity(e.target.value as ItemRarity)}>
                {RARITIES.map((r) => <option key={r} value={r}>{r === 'VeryRare' ? 'Very Rare' : r}</option>)}
              </select>
            </label>
          </div>
        </div>

        {category === 'Weapon' && (
          <>
            <label className="modal__field">
              {handedness === 'Versatile' ? 'Damage (one-handed)' : 'Damage'}
              <input value={damage} onChange={(e) => setDamage(e.target.value)} />
            </label>
            {handedness === 'Versatile' && (
              <label className="modal__field">
                Damage (two-handed)
                <input value={damageTwoHanded} onChange={(e) => setDamageTwoHanded(e.target.value)} />
              </label>
            )}
            <label className="modal__field">
              Properties
              <input value={weaponProperties} onChange={(e) => setWeaponProperties(e.target.value)} />
            </label>
            <div className="modal__field">
              <span>Handedness</span>
              <div className="modal__radio-group">
                {([['OneHanded', 'One-handed'], ['TwoHanded', 'Two-handed'], ['Versatile', 'Versatile']] as const).map(([value, label]) => (
                  <label key={value} className="modal__radio">
                    <input type="radio" name="handedness-edit" checked={handedness === value} onChange={() => setHandedness(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {category === 'Armour' && (
          <>
            <label className="modal__field">
              Armour slot
              <select value={armourSlot} onChange={(e) => setArmourSlot(e.target.value)}>
                {ARMOUR_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {showAc && (
              <label className="modal__field">
                AC
                <input value={acValue} onChange={(e) => setAcValue(e.target.value)} />
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
              <textarea value={effect} onChange={(e) => setEffect(e.target.value)} rows={2} />
            </label>
          </>
        )}

        <label className="modal__field">
          Abilities / description (homebrew)
          <textarea value={homebrewDescription} onChange={(e) => setHomebrewDescription(e.target.value)} rows={7} />
        </label>

        <div className="item-form__checkboxes">
          <label className="modal__checkbox">
            <input type="checkbox" checked={isAttunement} onChange={(e) => setIsAttunement(e.target.checked)} />
            Requires Attunement
          </label>

          <label className="modal__checkbox">
            <input type="checkbox" checked={isPlotFlagged} onChange={(e) => setIsPlotFlagged(e.target.checked)} />
            Plot Item
          </label>
        </div>

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}