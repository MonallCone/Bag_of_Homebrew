import type { EquipmentSlotData, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[]; // 6 accessory slots
  onUnequip: (slotType: SlotType) => void;
}

export function AccessoryColumn({ slots, onUnequip }: Props) {
  return (
    <div className="equipment-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={`Accessory ${i + 1}`} onUnequip={onUnequip}/>
      ))}
    </div>
  );
}