import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
  onItemClick: (item: Item) => void;
}

export function WeaponRow({ slots, onUnequip, draggedItem, onItemClick}: Props) {
  const labels = ['Set 1: Main', 'Set 1: Off', 'Set 2: Main', 'Set 2: Off'];
  return (
    <div className="weapon-row">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={labels[i]} onUnequip={onUnequip} draggedItem={draggedItem} onItemClick={onItemClick}/>
      ))}
    </div>
  );
}