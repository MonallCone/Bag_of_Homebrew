import { useState } from 'react';

interface Props {
  characterName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteCharacterModal({ characterName, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed === 'DELETE';

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError('Could not delete the character.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Delete character?</h2>
        <p className="confirm-delete__text">
          <strong>{characterName}</strong> and <strong>all of their items</strong> will be
          permanently deleted. This can't be undone.
        </p>
        <label className="modal__field">
          Type <strong>DELETE</strong> to confirm
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            autoFocus
          />
        </label>
        {error && <p className="modal__error">{error}</p>}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="modal__btn modal__btn--danger"
            onClick={handleDelete}
            disabled={!confirmed || deleting}
          >
            {deleting ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}