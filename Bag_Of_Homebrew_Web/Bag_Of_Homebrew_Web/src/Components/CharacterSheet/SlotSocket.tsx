import { useDroppable } from '@dnd-kit/core';
import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { validSlotsFor } from '../Inventory/ItemSlotRules';
import { imageSrc } from '../../api/images';
import { rarityFrameClass } from '../Inventory/rarityStyles';
import './SlotSocket.css';

interface Props {
  slot: EquipmentSlotData;
  label: string;
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
  onItemClick: (item: Item) => void;
  isLinkedOffHand?: boolean;
  onAdjustQuantity?: (itemId: string, newQuantity: number) => void;
}

export function SlotSocket({ slot, label, onUnequip, draggedItem, onItemClick, isLinkedOffHand, onAdjustQuantity}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.slotType });

  const isValidTarget = draggedItem !== null && validSlotsFor(draggedItem).includes(slot.slotType);
  const item = slot.item;
  const isRedacted = !!item?.isRedacted;
  const isHidden = !!item && (item.isHiddenFromPlayers || item.isHiddenByGm);

  const classes = [
    'slot-socket',
    item ? 'slot-socket--filled' : '',
    item && !isRedacted ? rarityFrameClass(item) : '',
    isRedacted ? 'slot-socket--redacted' : '',
    isLinkedOffHand ? 'slot-socket--linked' : '',
    isValidTarget ? 'slot-socket--valid-target' : '',
    isValidTarget && isOver ? 'slot-socket--over' : '',
  ].filter(Boolean).join(' ');

  if (isRedacted) {
    return (
      <div ref={setNodeRef} className={classes}>
        <div className="hidden-cloud" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={classes}
      onClick={() => { if (item) onItemClick(item); }}
      onContextMenu={(e) => {
        e.preventDefault();
        // Unequipping either slot of a two-handed weapon clears both (backend handles it)
        if (item) onUnequip(slot.slotType);
      }}
      title={
        isLinkedOffHand ? `${item?.name} (two-handed)` :
        item ? `${item.name} (right-click to unequip)` : label
      }
    >
      {item ? (
        item.imageUrl ? (
          <img className="slot-socket__image" src={imageSrc(item.imageUrl)} alt={item.name} draggable={false} />
        ) : (
          <span className="slot-socket__item-name">{item.name}</span>
        )
      ) : (
        <span className="slot-socket__label">{label}</span>
      )}

      {isHidden && !isLinkedOffHand && <div className="hidden-shimmer" />}

      {item?.isPlotFlagged && !isLinkedOffHand && <i className="fa-solid fa-flag plot-dot"></i>}
      {item?.isAttunement && !isLinkedOffHand && <i className="fa-regular fa-circle-dot attunement-dot" title="Requires attunement"></i>}

      {item && onAdjustQuantity && item.category === 'Consumable' && (
        <div className="slot-socket__qty" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="slot-socket__qty-btn"
            onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, -1); }}
            disabled={(item.quantity ?? 0) <= 0}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="slot-socket__qty-value">{item.quantity ?? 0}</span>
          <button
            className="slot-socket__qty-btn"
            onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, 1); }}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}