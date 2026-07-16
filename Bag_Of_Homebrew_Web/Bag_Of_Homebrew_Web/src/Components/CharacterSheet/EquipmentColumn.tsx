import type { EquipmentSlotData, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
}

export function EquipmentColumn({ slots, onUnequip }: Props) {
  const labels = ['Head', 'Chest', 'Gloves', 'Boots'];
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={labels[i]} onUnequip={onUnequip} />
      ))}
    </div>
  );
}