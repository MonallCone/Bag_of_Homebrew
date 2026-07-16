import type { EquipmentSlotData } from '../../Types/model';
import './SlotSocket.css';

interface Props {
  slot: EquipmentSlotData;
  label: string;
}

export function SlotSocket({ slot, label }: Props) {
  return (
    <div className={`slot-socket ${slot.item ? 'slot-socket--filled' : ''}`}>
      {slot.item ? (
        <span className="slot-socket__item-name">{slot.item.name}</span>
      ) : (
        <span className="slot-socket__label">{label}</span>
      )}
    </div>
  );
}