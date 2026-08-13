import { useState } from 'react';

interface CharacterSummary { id: string; name: string; }

interface Props {
  characters: CharacterSummary[];
  onJoin: (inviteCode: string, characterId: string) => Promise<void>;
  onClose: () => void;
}

export function JoinCampaignModal({ characters, onJoin, onClose }: Props) {
  const [code, setCode] = useState('');
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!code.trim()) { setError('Enter an invite code.'); return; }
    if (!characterId) { setError('You need a character to join with.'); return; }
    setSaving(true); setError(null);
    try { await onJoin(code.trim(), characterId); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not join.'); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Join Campaign</h2>
        <label className="modal__field">
          Invite code
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. K7Q2MX" autoFocus
            style={{ textTransform: 'uppercase' }} />
        </label>
        <label className="modal__field">
          Bring character
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
            {characters.length === 0 ? (
              <option value="">No characters available</option>
            ) : (
              characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
            )}
          </select>
        </label>
        {error && <p className="modal__error">{error}</p>}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={submit} disabled={saving || characters.length === 0}>
            {saving ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}