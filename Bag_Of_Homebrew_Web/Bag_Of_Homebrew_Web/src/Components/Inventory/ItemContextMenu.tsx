import type { Item, SlotType } from '../../Types/model';
import { validSlotsFor, SLOT_LABELS } from './ItemSlotRules';

interface Props {
  item: Item;
  x: number;
  y: number;
  onEquip: (itemId: string, slotType: SlotType, twoHanded?: boolean) => void;
  onDeleteRequest: (item: Item) => void;
  onAdjustQuantity: (itemId: string, delta: number) => void;
  onClose: () => void;
}

export function ItemContextMenu({ item, x, y, onEquip, onDeleteRequest, onAdjustQuantity, onClose }: Props) {
  const slots = validSlotsFor(item);
  const handedness = item.properties['handedness'] as string | undefined;
  const isVersatile = item.category === 'Weapon' && handedness === 'Versatile';
  const isTwoHanded = item.category === 'Weapon' && handedness === 'TwoHanded';

  // Two-handed weapons can only main-hand
  const equipSlots = isTwoHanded
    ? slots.filter((s) => s === 'WeaponSet1Main' || s === 'WeaponSet2Main')
    : slots;

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="context-menu" style={{ top: y, left: x }}>
        {equipSlots.length === 0 ? (
          <div className="context-menu__item context-menu__item--disabled">Can't be equipped</div>
        ) : (
          equipSlots.map((slot) => {
            const isMainHand = slot === 'WeaponSet1Main' || slot === 'WeaponSet2Main';

            if (isVersatile && isMainHand) {
              // offer both grips
              return (
                <div key={slot}>
                  <button className="context-menu__item" onClick={() => { onEquip(item.id, slot, false); onClose(); }}>
                    Equip: {SLOT_LABELS[slot]} (1H)
                  </button>
                  <button className="context-menu__item" onClick={() => { onEquip(item.id, slot, true); onClose(); }}>
                    Equip: {SLOT_LABELS[slot]} (2H, uses off-hand)
                  </button>
                </div>
              );
            }

            return (
              <button key={slot} className="context-menu__item" onClick={() => { onEquip(item.id, slot, isTwoHanded); onClose(); }}>
                Equip: {SLOT_LABELS[slot]}{isTwoHanded ? ' (2H)' : ''}
              </button>
            );
          })
        )}

        {item.category === 'Consumable' && (
          <button className="context-menu__item" onClick={() => { onAdjustQuantity(item.id, -1); onClose(); }} disabled={(item.quantity ?? 0) <= 0}>
            Use one ({item.quantity ?? 0} left)
          </button>
        )}

        <div className="context-menu__divider" />
        <button className="context-menu__item context-menu__item--danger" onClick={() => { onDeleteRequest(item); onClose(); }}>
          Delete
        </button>
      </div>
    </>
  );
}