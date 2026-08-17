import { useState, useEffect } from 'react';

interface Props {
  currentHp: number | null;
  maxHp: number | null;
  tempHp: number | null;
  readOnly?: boolean;
  onChange: (currentHp: number | null, maxHp: number | null, tempHp: number | null) => void;
}

export function HealthHeart({ currentHp, maxHp, tempHp, readOnly = false, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Local editable copies for the inline number fields
  const [curVal, setCurVal] = useState(currentHp?.toString() ?? '');
  const [maxVal, setMaxVal] = useState(maxHp?.toString() ?? '');
  const [tempVal, setTempVal] = useState(tempHp?.toString() ?? '');

  useEffect(() => {
    setCurVal(currentHp?.toString() ?? '');
    setMaxVal(maxHp?.toString() ?? '');
    setTempVal(tempHp?.toString() ?? '');
    }, [currentHp, maxHp, tempHp]);

  // Keep local fields synced if props change (e.g. after a reload)
  // (simple approach: re-init when the incoming values change)
  const parse = (s: string): number | null => (s.trim() === '' ? null : Number(s) || 0);

  const commit = () => {
    onChange(parse(curVal), parse(maxVal), parse(tempVal));
  };

  const stepCurrent = (delta: number) => {
    if (readOnly) return;
    const next = (currentHp ?? 0) + delta;
    setCurVal(next.toString());
    onChange(next, maxHp, tempHp);
  };

  return (
    <div className="health-heart">
      <div className="health-heart__badge">
        <svg viewBox="0 0 120 110" className="health-heart__svg">
          <path
            d="M60 100 C 20 70, 5 45, 5 30 C 5 12, 20 5, 35 5 C 47 5, 55 13, 60 22 C 65 13, 73 5, 85 5 C 100 5, 115 12, 115 30 C 115 45, 100 70, 60 100 Z"
            className="health-heart__shape"
          />
        </svg>

        <div className="health-heart__values">
          {readOnly ? (
            <span className="health-heart__readonly">
              {currentHp ?? '—'} / {maxHp ?? '—'}
            </span>
          ) : (
            <div className="health-heart__hp">
              <input
                className="health-heart__input health-heart__input--cur"
                value={curVal}
                onChange={(e) => setCurVal(e.target.value)}
                onBlur={commit}
                aria-label="Current HP"
              />
              <span className="health-heart__slash">/</span>
              <input
                className="health-heart__input health-heart__input--max"
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                onBlur={commit}
                aria-label="Max HP"
              />
            </div>
          )}

          {(tempHp ?? 0) > 0 && (
            <span className="health-heart__temp">{tempHp}</span>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="health-heart__controls">
          <button className="health-heart__step" onClick={() => stepCurrent(-1)} aria-label="Lose 1 HP">−</button>
          <button className="health-heart__edit" onClick={() => setShowModal(true)}>Edit</button>
          <button className="health-heart__step" onClick={() => stepCurrent(1)} aria-label="Gain 1 HP">+</button>
        </div>
      )}

      {showModal && (
        <HealthModal
          currentHp={currentHp}
          maxHp={maxHp}
          tempHp={tempHp}
          onApply={(c, m, t) => { onChange(c, m, t); setCurVal(c?.toString() ?? ''); setMaxVal(m?.toString() ?? ''); setTempVal(t?.toString() ?? ''); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function HealthModal({ currentHp, maxHp, tempHp, onApply, onClose }: {
  currentHp: number | null;
  maxHp: number | null;
  tempHp: number | null;
  onApply: (c: number | null, m: number | null, t: number | null) => void;
  onClose: () => void;
}) {
  const [cur, setCur] = useState(currentHp?.toString() ?? '');
  const [max, setMax] = useState(maxHp?.toString() ?? '');
  const [temp, setTemp] = useState(tempHp?.toString() ?? '');
  const [delta, setDelta] = useState('');

  const parse = (s: string): number | null => (s.trim() === '' ? null : Number(s) || 0);

  const applyDelta = () => {
    const d = Number(delta) || 0;
    const next = (Number(cur) || 0) + d;
    setCur(next.toString());
    setDelta('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Edit Health</h2>

        <div className="modal__field">
          Damage / Heal (± amount applied to current)
          <div className="health-modal__delta">
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. -8 or 12"
              onKeyDown={(e) => { if (e.key === 'Enter') applyDelta(); }}
            />
            <button className="modal__btn modal__btn--secondary" onClick={applyDelta}>Apply</button>
          </div>
        </div>

        <label className="modal__field">
          Current HP
          <input value={cur} onChange={(e) => setCur(e.target.value)} />
        </label>
        <label className="modal__field">
          Max HP
          <input value={max} onChange={(e) => setMax(e.target.value)} />
        </label>
        <label className="modal__field">
          Temp HP
          <input value={temp} onChange={(e) => setTemp(e.target.value)} />
        </label>

        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={() => onApply(parse(cur), parse(max), parse(temp))}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}