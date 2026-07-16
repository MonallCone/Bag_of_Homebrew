import type { EquipmentSlotData } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[]; // expects Head, Chest, Gloves, Boots in order
}

export function EquipmentColumn({ slots }: Props) {
  const labels = ['Head', 'Chest', 'Gloves', 'Boots'];
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={labels[i]} />
      ))}
    </div>
  );
}