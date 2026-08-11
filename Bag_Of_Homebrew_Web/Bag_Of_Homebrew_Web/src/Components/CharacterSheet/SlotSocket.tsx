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
}

export function SlotSocket({ slot, label, onUnequip, draggedItem, onItemClick, isLinkedOffHand }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.slotType });

  const isValidTarget = draggedItem !== null && validSlotsFor(draggedItem).includes(slot.slotType);

  const classes = [
    'slot-socket',
    slot.item ? 'slot-socket--filled' : '',
    slot.item ? rarityFrameClass(slot.item) : '',
    isLinkedOffHand ? 'slot-socket--linked' : '',
    isValidTarget ? 'slot-socket--valid-target' : '',
    isValidTarget && isOver ? 'slot-socket--over' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      className={classes}
      onClick={() => { if (slot.item) onItemClick(slot.item); }}
      onContextMenu={(e) => {
        e.preventDefault();
        // Unequipping either slot of a two-handed weapon clears both (backend handles it)
        if (slot.item) onUnequip(slot.slotType);
      }}
      title={
        isLinkedOffHand ? `${slot.item?.name} (two-handed)` :
        slot.item ? `${slot.item.name} (right-click to unequip)` : label
      }
    >
      {slot.item ? (
        slot.item.imageUrl ? (
          <img className="slot-socket__image" src={imageSrc(slot.item.imageUrl)} alt={slot.item.name} draggable={false} />
        ) : (
          <span className="slot-socket__item-name">{slot.item.name}</span>
        )
      ) : (
        <span className="slot-socket__label">{label}</span>
      )}
      {slot.item?.isPlotFlagged && !isLinkedOffHand && <span className="plot-dot" />}
    </div>
  );
}