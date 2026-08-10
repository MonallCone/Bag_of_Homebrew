import { useDroppable } from '@dnd-kit/core';
import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { validSlotsFor } from '../Inventory/ItemSlotRules';
import { imageSrc } from '../../api/images';
import './SlotSocket.css';

interface Props {
  slot: EquipmentSlotData;
  label: string;
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
}

export function SlotSocket({ slot, label, onUnequip, draggedItem }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.slotType });

  const isValidTarget = draggedItem !== null && validSlotsFor(draggedItem).includes(slot.slotType);

  const classes = [
    'slot-socket',
    slot.item ? 'slot-socket--filled' : '',
    isValidTarget ? 'slot-socket--valid-target' : '',
    isValidTarget && isOver ? 'slot-socket--over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={classes}
      onContextMenu={(e) => {
        e.preventDefault();
        if (slot.item) onUnequip(slot.slotType);
      }}
      title={slot.item ? `${slot.item.name} (right-click to unequip)` : label}
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
    </div>
  );
}