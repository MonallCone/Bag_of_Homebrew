import type { EquipmentSlotData, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[]; // WeaponSet1Main, WeaponSet1Off, WeaponSet2Main, WeaponSet2Off
  onUnequip: (slotType: SlotType) => void;
}

export function WeaponRow({ slots, onUnequip }: Props) {
  const labels = ['Set 1: Main', 'Set 1: Off', 'Set 2: Main', 'Set 2: Off'];
  return (
    <div className="weapon-row">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={labels[i]} onUnequip={onUnequip} />
      ))}
    </div>
  );
}