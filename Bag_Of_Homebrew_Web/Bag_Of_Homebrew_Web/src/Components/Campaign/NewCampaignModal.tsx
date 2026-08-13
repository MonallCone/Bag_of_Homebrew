import { useState } from 'react';

interface Props {
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}

export function NewCampaignModal({ onCreate, onClose }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setError('Please enter a name.'); return; }
    setSaving(true); setError(null);
    try { await onCreate(name.trim()); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create campaign.'); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">New Campaign</h2>
        <label className="modal__field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Sunless Citadel" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </label>
        {error && <p className="modal__error">{error}</p>}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}