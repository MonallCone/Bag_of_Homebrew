import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
}

export function EquipmentColumn({ slots, onUnequip, draggedItem }: Props) {
  const labels = ['Head', 'Chest', 'Gloves', 'Boots'];
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={labels[i]} onUnequip={onUnequip} draggedItem={draggedItem} />
      ))}
    </div>
  );
}