import type { EquipmentSlotData, SlotType } from '../../Types/model';
import './SlotSocket.css';

interface Props {
  slot: EquipmentSlotData;
  label: string;
  onUnequip: (slotType: SlotType) => void;
}

export function SlotSocket({ slot, label, onUnequip }: Props) {
  return (
    <div
      className={`slot-socket ${slot.item ? 'slot-socket--filled' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (slot.item) onUnequip(slot.slotType);
      }}
      title={slot.item ? `${slot.item.name} (right-click to unequip)` : label}
    >
      {slot.item ? (
        <span className="slot-socket__item-name">{slot.item.name}</span>
      ) : (
        <span className="slot-socket__label">{label}</span>
      )}
    </div>
  );
}