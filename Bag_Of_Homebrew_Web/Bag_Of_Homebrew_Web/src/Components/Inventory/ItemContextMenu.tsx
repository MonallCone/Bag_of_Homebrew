import type { Item, SlotType } from '../../Types/model';
import { validSlotsFor, SLOT_LABELS } from './ItemSlotRules';
import { useState } from 'react';

interface Props {
  item: Item;
  x: number;
  y: number;
  onEquip?: (itemId: string, slotType: SlotType, twoHanded?: boolean) => void;
  onReturnToVault?: (itemId: string) => void;
  onDeleteRequest: (item: Item) => void;
  onAdjustQuantity?: (itemId: string, delta: number) => void; 
  onClose: () => void;
  sendToCharacterTargets?: { id: string; name: string }[];
  onSendToCharacter?: (itemId: string, characterId: string) => void;
  inCampaign?: boolean;
}

export function ItemContextMenu({ item, x, y, onEquip, onDeleteRequest, onAdjustQuantity, onClose, onReturnToVault, sendToCharacterTargets, onSendToCharacter, inCampaign = false}: Props) {
  const slots = validSlotsFor(item);
  const handedness = item.properties['handedness'] as string | undefined;
  const isVersatile = item.category === 'Weapon' && handedness === 'Versatile';
  const isTwoHanded = item.category === 'Weapon' && handedness === 'TwoHanded';
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Two-handed weapons can only main-hand
  const equipSlots = isTwoHanded
    ? slots.filter((s) => s === 'WeaponSet1Main' || s === 'WeaponSet2Main')
    : slots;

  const showEquip = !!onEquip && equipSlots.length > 0;
  const canSend = !!onSendToCharacter && !!sendToCharacterTargets;

  return (
    <>
      <div
        className="context-menu-backdrop"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div className="context-menu" style={{ top: y, left: x }}>
        {/* Equip options — character mode only */}
        {showEquip &&
          equipSlots.map((slot) => {
            const isMainHand = slot === 'WeaponSet1Main' || slot === 'WeaponSet2Main';

            if (isVersatile && isMainHand) {
              return (
                <div key={slot}>
                  <button
                    className="context-menu__item"
                    onClick={() => { onEquip!(item.id, slot, false); onClose(); }}
                  >
                    Equip: {SLOT_LABELS[slot]} (1H)
                  </button>
                  <button
                    className="context-menu__item"
                    onClick={() => { onEquip!(item.id, slot, true); onClose(); }}
                  >
                    Equip: {SLOT_LABELS[slot]} (2H, uses off-hand)
                  </button>
                </div>
              );
            }

            return (
              <button
                key={slot}
                className="context-menu__item"
                onClick={() => { onEquip!(item.id, slot, isTwoHanded); onClose(); }}
              >
                Equip: {SLOT_LABELS[slot]}{isTwoHanded ? ' (2H)' : ''}
              </button>
            );
          })}

        {/* If equip handler exists but no valid slots, show a disabled hint */}
        {!!onEquip && equipSlots.length === 0 && (
          <div className="context-menu__item context-menu__item--disabled">Can't be equipped</div>
        )}

        {/* Send to Character — vault mode only */}
        {canSend && (
          <div
            className="context-menu__submenu-parent"
            onMouseEnter={() => setSubmenuOpen(true)}
            onMouseLeave={() => setSubmenuOpen(false)}
          >
            <button className="context-menu__item context-menu__item--submenu">
              Send to Character
              <span className="context-menu__chevron">▸</span>
            </button>
            {submenuOpen && (
              <div className="context-menu context-menu--sub">
                {sendToCharacterTargets!.length === 0 ? (
                  <div className="context-menu__item context-menu__item--disabled">No characters</div>
                ) : (
                  sendToCharacterTargets!.map((c) => (
                    <button
                      key={c.id}
                      className="context-menu__item"
                      onClick={() => { onSendToCharacter!(item.id, c.id); onClose(); }}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Consumable use — both modes */}
          {item.category === 'Consumable' && onAdjustQuantity && (
            <button
              className="context-menu__item"
              onClick={() => { onAdjustQuantity(item.id, -1); onClose(); }}
              disabled={(item.quantity ?? 0) <= 0}
            >
              Use one ({item.quantity ?? 0} left)
            </button>
          )}

        {/* Return to Vault — character mode only */}
        {onReturnToVault && (
          <button className="context-menu__item" onClick={() => { onReturnToVault(item.id); onClose(); }}>
            {inCampaign ? 'Return to Campaign Vault' : 'Return to Vault'}
          </button>
        )}

        {/* Delete — both modes */}
        <div className="context-menu__divider" />
        <button
          className="context-menu__item context-menu__item--danger"
          onClick={() => { onDeleteRequest(item); onClose(); }}
        >
          Delete
        </button>
      </div>
    </>
  );
}