import { useState } from 'react';

interface Props {
  currentName: string;
  title?: string;
  onRename: (name: string) => Promise<void>;
  onClose: () => void;
}

export function RenameModal({ currentName, title="Rename", onRename, onClose }: Props) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onRename(name.trim());
      onClose();
    } catch {
      setError('Could not change Name.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{title}</h2>
        <label className="modal__field">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </label>
        {error && <p className="modal__error">{error}</p>}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}