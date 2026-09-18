import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';
import { SlotSocket } from './SlotSocket';

interface Props {
  slots: EquipmentSlotData[];
  onUnequip: (slotType: SlotType) => void;
  draggedItem: Item | null;
  onItemClick: (item: Item) => void;
  onAdjustQuantity: (itemId: string, newQuantity: number) => void; 
}

export function PouchColumn({ slots, onUnequip, draggedItem, onItemClick, onAdjustQuantity}: Props) {
  return (
    <div className="pouch-column">
      {slots.map((slot, i) => (
        <SlotSocket key={slot.slotType} slot={slot} label={`Pouch ${i + 1}`} onUnequip={onUnequip} draggedItem={draggedItem} onItemClick={onItemClick} onAdjustQuantity={onAdjustQuantity}/>
      ))}
    </div>
  );
}