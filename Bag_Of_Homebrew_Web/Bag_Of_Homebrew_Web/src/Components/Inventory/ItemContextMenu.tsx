import { useState, useLayoutEffect, useRef } from 'react';
import type { Item, SlotType } from '../../Types/model';
import { validSlotsFor, SLOT_LABELS } from './ItemSlotRules';

interface Props {
  item: Item;
  x: number;
  y: number;
  onEquip?: (itemId: string, slotType: SlotType, twoHanded?: boolean) => void;
  onReturnToVault?: (itemId: string) => void;
  onDeleteRequest: (item: Item) => void;
  onAdjustQuantity?: (itemId: string, delta: number) => void;
  sendToCharacterTargets?: { id: string; name: string }[];
  onSendToCharacter?: (itemId: string, characterId: string) => void;
  giftTargets?: { userId: string; name: string }[];
  onGift?: (itemId: string, toUserId: string) => void;
  onAcceptTransfer?: (transferId: string) => void;
  onRejectTransfer?: (transferId: string) => void;
  inCampaign?: boolean;
  onClose: () => void;
}

export function ItemContextMenu({
  item,
  x,
  y,
  onEquip,
  onReturnToVault,
  onDeleteRequest,
  onAdjustQuantity,
  sendToCharacterTargets,
  onSendToCharacter,
  giftTargets,
  onGift,
  onAcceptTransfer,
  onRejectTransfer,
  inCampaign = false,
  onClose,
}: Props) {
  const [charSubmenuOpen, setCharSubmenuOpen] = useState(false);
  const [giftSubmenuOpen, setGiftSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({top: y, left: x});

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    let left = x;
    let top = y;
    // If it overflows right, shift left
    if (x + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin;
    }
    // If it overflows bottom, shift up
    if (y + rect.height > window.innerHeight - margin) {
      top = window.innerHeight - rect.height - margin;
    }
    setPos({ top: Math.max(margin, top), left: Math.max(margin, left) });
  }, [x, y]);

  // ─────────────────────────────────────────────
  // Early returns: pending gift states
  // ─────────────────────────────────────────────
  if (item.__pendingIncoming) {
    return (
      <>
        <div
          className="context-menu-backdrop"
          onClick={onClose}
          onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        />
        <div className="context-menu" style={{ top: y, left: x }}>
          <button
            className="context-menu__item"
            onClick={() => { onAcceptTransfer?.(item.__pendingIncoming!); onClose(); }}
          >
            Accept gift
          </button>
          <button
            className="context-menu__item context-menu__item--danger"
            onClick={() => { onRejectTransfer?.(item.__pendingIncoming!); onClose(); }}
          >
            Reject gift
          </button>
        </div>
      </>
    );
  }

  if (item.__pendingOutgoing) {
    return (
      <>
        <div
          className="context-menu-backdrop"
          onClick={onClose}
          onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        />
        <div className="context-menu" style={{ top: y, left: x }}>
          <div className="context-menu__item context-menu__item--disabled">Awaiting recipient…</div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // Normal menu
  // ─────────────────────────────────────────────
  const slots = validSlotsFor(item);
  const handedness = item.properties['handedness'] as string | undefined;
  const isVersatile = item.category === 'Weapon' && handedness === 'Versatile';
  const isTwoHanded = item.category === 'Weapon' && handedness === 'TwoHanded';

  const equipSlots = isTwoHanded
    ? slots.filter((s) => s === 'WeaponSet1Main' || s === 'WeaponSet2Main')
    : slots;

  const showEquip = !!onEquip && equipSlots.length > 0;
  const canSendToCharacter = !!onSendToCharacter && !!sendToCharacterTargets;
  const canGift = !!onGift && !!giftTargets && giftTargets.length > 0;

  return (
    <>
      <div
        className="context-menu-backdrop"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <div ref={menuRef} className="context-menu" style={{ top: pos.top, left: pos.left}}>
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

        {!!onEquip && equipSlots.length === 0 && (
          <div className="context-menu__item context-menu__item--disabled">Can't be equipped</div>
        )}

        {/* Return to Vault — character mode */}
        {onReturnToVault && (
          <button
            className="context-menu__item"
            onClick={() => { onReturnToVault(item.id); onClose(); }}
          >
            {inCampaign ? 'Return to Campaign Vault' : 'Return to Vault'}
          </button>
        )}

        {/* Send to Character — personal vault mode */}
        {canSendToCharacter && (
          <div
            className="context-menu__submenu-parent"
            onMouseEnter={() => setCharSubmenuOpen(true)}
            onMouseLeave={() => setCharSubmenuOpen(false)}
          >
            <button className="context-menu__item context-menu__item--submenu">
              Send to Character
              <span className="context-menu__chevron">▸</span>
            </button>
            {charSubmenuOpen && (
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

        {/* Send to Player — campaign mode */}
        {canGift && (
          <div
            className="context-menu__submenu-parent"
            onMouseEnter={() => setGiftSubmenuOpen(true)}
            onMouseLeave={() => setGiftSubmenuOpen(false)}
          >
            <button className="context-menu__item context-menu__item--submenu">
              Send to Player
              <span className="context-menu__chevron">▸</span>
            </button>
            {giftSubmenuOpen && (
              <div className="context-menu context-menu--sub">
                {giftTargets!.map((t) => (
                  <button
                    key={t.userId}
                    className="context-menu__item"
                    onClick={() => { onGift!(item.id, t.userId); onClose(); }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Consumable use */}
        {item.category === 'Consumable' && onAdjustQuantity && (
          <button
            className="context-menu__item"
            onClick={() => { onAdjustQuantity(item.id, -1); onClose(); }}
            disabled={(item.quantity ?? 0) <= 0}
          >
            Use one ({item.quantity ?? 0} left)
          </button>
        )}

        {/* Delete */}
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