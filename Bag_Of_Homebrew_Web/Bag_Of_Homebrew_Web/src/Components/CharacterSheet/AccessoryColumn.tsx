import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
}

export function AccessoryColumn({ slots, onUnequip, draggedItem }: Props) {
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={`Accessory ${i + 1}`} onUnequip={onUnequip} draggedItem={draggedItem} />
      ))}
    </div>
  );
}