import { useDroppable } from '@dnd-kit/core';
import { imageSrc } from '../../api/images';
import type { Item, SlotType } from '../../Types/model';


type PouchSlotType = 'Pouch1' | 'Pouch2' | 'Pouch3' | 'Pouch4';

const POUCH_SLOTS: PouchSlotType[] = ['Pouch1', 'Pouch2', 'Pouch3', 'Pouch4'];

interface EquipmentSlotData {
  slotType: string;
  item: Item | null;
}

interface PouchColumnProps {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
  onAdjustQuantity: (itemId: string, newQuantity: number) => void;
  onSelectItem?: (item: Item) => void;
  readOnly?: boolean;
}

export function PouchColumn({
  slots,
  onUnequip,
  onAdjustQuantity,
  onSelectItem,
  readOnly = false,
}: PouchColumnProps) {
  return (
    <div className="pouch-column">
      <h3 className="pouch-column__title">Pouch</h3>
      {POUCH_SLOTS.map((slotType) => {
        const slot = slots.find((s) => s.slotType === slotType);
        return (
          <PouchSlot
            key={slotType}
            slotType={slotType}
            item={slot?.item ?? null}
            onUnequip={onUnequip}
            onAdjustQuantity={onAdjustQuantity}
            onSelectItem={onSelectItem}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}

interface PouchSlotProps {
  slotType: PouchSlotType;
  item: Item | null;
  onUnequip: (slotType: SlotType) => void;
  onAdjustQuantity: (itemId: string, newQuantity: number) => void;
  onSelectItem?: (item: Item) => void;
  readOnly?: boolean;
}

function PouchSlot({
  slotType,
  item,
  onUnequip,
  onAdjustQuantity,
  onSelectItem,
  readOnly = false,
}: PouchSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotType}`,
    data: { slotType, accepts: ['Consumable', 'Misc'] },
    disabled: readOnly,
  });

  const isConsumable = item?.category === 'Consumable';
  const quantity = item?.quantity ?? 1;

  return (
    <div
      ref={setNodeRef}
      className={[
        'pouch-slot',
        isOver ? 'pouch-slot--over' : '',
        item ? 'pouch-slot--filled' : '',
      ].join(' ').trim()}
    >
      {item ? (
        <>
          <button
            type="button"
            className="pouch-slot__content"
            onClick={() => onSelectItem?.(item)}
            title={item.name}
          >
            {item.imageUrl && (
              <img className="pouch-slot__img" src={imageSrc(item.imageUrl)} alt={item.name} />
            )}
            <span className="pouch-slot__name">{item.name}</span>
          </button>

          {isConsumable && !readOnly && (
            <div className="pouch-slot__qty" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="pouch-slot__qty-btn"
                onClick={() => onAdjustQuantity(item.id, quantity - 1)}
                disabled={quantity <= 0}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="pouch-slot__qty-value">{quantity}</span>
              <button
                type="button"
                className="pouch-slot__qty-btn"
                onClick={() => onAdjustQuantity(item.id, quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              className="pouch-slot__unequip"
              onClick={() => onUnequip(slotType)}
              title="Remove from pouch"
              aria-label="Remove from pouch"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </>
      ) : (
        <span className="pouch-slot__empty">Pouch</span>
      )}
    </div>
  );
}