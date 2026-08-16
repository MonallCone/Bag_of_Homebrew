import { useState } from "react";

interface Props {
  campaignName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmLeaveModal({ campaignName, onConfirm, onClose }: Props) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Leave campaign?</h2>
        <p className="confirm-delete__text">
          You'll leave <strong>{campaignName}</strong>. Your character keeps its items.
          You can rejoin later with the invite code.
        </p>
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={leaving}>Cancel</button>
          <button
            className="modal__btn modal__btn--danger"
            onClick={async () => { setLeaving(true); await onConfirm(); onClose(); }}
            disabled={leaving}
          >
            {leaving ? 'Leaving…' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}