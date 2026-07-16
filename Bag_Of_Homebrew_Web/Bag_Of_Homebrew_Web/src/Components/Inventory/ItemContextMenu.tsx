import type { Item, SlotType } from '../../Types/model';
import { validSlotsFor, SLOT_LABELS } from './ItemSlotRules';

interface Props {
  item: Item;
  x: number;
  y: number;
  onEquip: (itemId: string, slotType: SlotType) => void;
  onClose: () => void;
}

export function ItemContextMenu({ item, x, y, onEquip, onClose }: Props) {
  const slots = validSlotsFor(item);

  return (
    <>
      <div
        className="context-menu-backdrop"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div className="context-menu" style={{ top: y, left: x }}>
        {slots.length === 0 ? (
          <div className="context-menu__item context-menu__item--disabled">Can't be equipped</div>
        ) : (
          slots.map((slot) => (
            <button
              key={slot}
              className="context-menu__item"
              onClick={() => {
                onEquip(item.id, slot);
                onClose();
              }}
            >
              Equip: {SLOT_LABELS[slot]}
            </button>
          ))
        )}
        {/* Later: Send to DM Vault / Send to player (party mode) */}
      </div>
    </>
  );
}