import { useState } from 'react';
import type { EquipmentSlotData } from '../../Types/model';

interface Props {
  slots: EquipmentSlotData[];
  manualAc: string;
  onManualAcChange: (value: string) => void;
}

export function AcShield({ slots, manualAc, onManualAcChange }: Props) {
  const [value, setValue] = useState(manualAc);

  // Read AC from equipped chest + shield armour
  const equippedAc = (() => {
    const parts: string[] = [];
    const chest = slots.find((s) => s.slotType === 'Chest')?.item;
    if (chest?.category === 'Armour' && chest.properties['ac']) {
      parts.push(`Chest ${chest.properties['ac']}`);
    }
    // A shield lives in a weapon slot; find any equipped item that's armour with slot "Shield"
    const shieldSlot = slots.find(
      (s) => s.item?.category === 'Armour' && s.item.properties['slot'] === 'Shield'
    );
    if (shieldSlot?.item?.properties['ac']) {
      parts.push(`Shield ${shieldSlot.item.properties['ac']}`);
    }
    return parts;
  })();

  return (
    <div className="ac-shield">
      <div className="ac-shield__badge">
        <svg viewBox="0 0 100 120" className="ac-shield__svg">
          <path
            d="M50 4 L92 20 L92 60 Q92 100 50 116 Q8 100 8 60 L8 20 Z"
            className="ac-shield__shape"
          />
        </svg>
        <input
          className="ac-shield__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => onManualAcChange(value)}
          placeholder="AC"
          aria-label="Armour class"
        />
      </div>
      {equippedAc.length > 0 && (
        <div className="ac-shield__equipped">{equippedAc.join(' · ')}</div>
      )}
    </div>
  );
}