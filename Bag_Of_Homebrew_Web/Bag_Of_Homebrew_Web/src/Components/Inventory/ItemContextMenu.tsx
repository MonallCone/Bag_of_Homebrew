import type { Item, SlotType } from '../../Types/model';
import { validSlotsFor, SLOT_LABELS } from './ItemSlotRules';

interface Props {
  item: Item;
  x: number;
  y: number;
  onEquip: (itemId: string, slotType: SlotType) => void;
  onDeleteRequest: (item: Item) => void;
  onClose: () => void;
  onAdjustQuantity: (itemId: string, delta: number) => void;
}

export function ItemContextMenu({ item, x, y, onEquip, onClose, onDeleteRequest, onAdjustQuantity }: Props) {
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
        {item.category === 'Consumable' && (
          <button
            className="context-menu__item"
            onClick={() => { onAdjustQuantity(item.id, -1); onClose(); }}
            disabled={(item.quantity ?? 0) <= 0}
          >
            Use one ({item.quantity ?? 0} left)
          </button>
        )}
        <div className="context-menu__divider" />
        <button
          className="context-menu__item context-menu__item--danger"
          onClick={() => {
            onDeleteRequest(item);
            onClose();
          }}
        >
          Delete
        </button>
        {/* Later: Send to DM Vault / Send to player (party mode) */}
      </div>
    </>
  );
}