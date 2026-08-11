import { useState } from 'react';
import type { EquipmentSlotData, Item, SlotType } from '../../Types/model';

interface Props {
  slots: EquipmentSlotData[];
  linkedOffHands: Set<SlotType>;
  onUpdateProperties: (itemId: string, properties: Record<string, string>) => void;
}

// Which weapon slots to read, in display order
const WEAPON_SLOTS: SlotType[] = ['WeaponSet1Main', 'WeaponSet1Off', 'WeaponSet2Main', 'WeaponSet2Off'];

export function WeaponSummary({ slots, linkedOffHands, onUpdateProperties }: Props) {
  // Collect equipped weapons, skipping the linked off-hand duplicate of a two-handed weapon
  const weapons: Item[] = [];
  const seen = new Set<string>();
  for (const slotType of WEAPON_SLOTS) {
    if (linkedOffHands.has(slotType)) continue; // don't list the two-handed weapon twice
    const slot = slots.find((s) => s.slotType === slotType);
    if (slot?.item && slot.item.category === 'Weapon' && !seen.has(slot.item.id)) {
      weapons.push(slot.item);
      seen.add(slot.item.id);
    }
  }

  // Always show a few blank rows below for weapons not in the system / improvised
  const BLANK_ROWS = 3;

  return (
    <div className="weapon-summary">
      <div className="weapon-summary__row weapon-summary__row--header">
        <span>Name</span>
        <span>Range</span>
        <span>Attack</span>
        <span>Damage</span>
      </div>

      {weapons.map((w) => (
        <EquippedRow key={w.id} item={w} onUpdateProperties={onUpdateProperties} />
      ))}

      {Array.from({ length: BLANK_ROWS }, (_, i) => (
        <div key={`blank-${i}`} className="weapon-summary__row">
          <input className="weapon-summary__input" placeholder="—" />
          <input className="weapon-summary__input" />
          <input className="weapon-summary__input" />
          <input className="weapon-summary__input" />
        </div>
      ))}
    </div>
  );
}

function EquippedRow({ item, onUpdateProperties }: { item: Item; onUpdateProperties: Props['onUpdateProperties'] }) {
  const p = item.properties as Record<string, string>;
  const [range, setRange] = useState(p.range ?? '');
  const [attackMod, setAttackMod] = useState(p.attackMod ?? '');
  const [damageMod, setDamageMod] = useState(p.damageMod ?? '');

  // Persist on blur (avoids a save on every keystroke)
  const save = () => onUpdateProperties(item.id, { range, attackMod, damageMod });

  const damageDie = p.damage ?? '';
  const damageDisplay = damageMod ? `${damageDie} ${damageMod.startsWith('+') || damageMod.startsWith('-') ? damageMod : '+' + damageMod}` : damageDie;

  return (
    <div className="weapon-summary__row weapon-summary__row--equipped">
      <span className="weapon-summary__name">{item.name}</span>
      <input
        className="weapon-summary__input"
        value={range}
        onChange={(e) => setRange(e.target.value)}
        onBlur={save}
        placeholder="—"
      />
      <input
        className="weapon-summary__input"
        value={attackMod}
        onChange={(e) => setAttackMod(e.target.value)}
        onBlur={save}
        placeholder="+0"
      />
      <div className="weapon-summary__damage">
        <span className="weapon-summary__die">{damageDie || '—'}</span>
        <input
          className="weapon-summary__input weapon-summary__mod"
          value={damageMod}
          onChange={(e) => setDamageMod(e.target.value)}
          onBlur={save}
          placeholder="+0"
        />
      </div>
    </div>
  );
}