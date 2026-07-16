import type { EquipmentSlotData } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[]; // 6 accessory slots
}

export function AccessoryColumn({ slots }: Props) {
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={`Accessory ${i + 1}`} />
      ))}
    </div>
  );
}