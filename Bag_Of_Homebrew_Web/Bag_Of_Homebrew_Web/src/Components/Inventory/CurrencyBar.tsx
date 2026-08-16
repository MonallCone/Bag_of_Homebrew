import { useState } from 'react';
import { COINS, type CurrencyAmounts, convertCurrency, type CoinType } from './coins';

interface Props {
  amounts: CurrencyAmounts;
  readOnly?: boolean;
  onChange: (amounts: CurrencyAmounts) => void;
}

export function CurrencyBar({ amounts, readOnly = false, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);

  const step = (key: keyof CurrencyAmounts, delta: number) => {
    if (readOnly) return;
    const next = { ...amounts, [key]: Math.max(0, amounts[key] + delta) };
    onChange(next);
  };

  return (
    <div className="currency-bar">
      {COINS.map((coin) => (
        <div key={coin.key} className="currency-coin" style={{ color: coin.color }}>
          {!readOnly && (
            <button className="currency-coin__step" onClick={() => step(coin.key, 1)} aria-label={`Add ${coin.abbr}`}>+</button>
          )}
          <div className="currency-coin__body" onClick={() => !readOnly && setShowModal(true)}>
            <i className="fa-light fa-coins currency-coin__icon" />
            <span className="currency-coin__amount">{amounts[coin.key]}</span>
            <span className="currency-coin__abbr">{coin.abbr}</span>
          </div>
          {!readOnly && (
            <button className="currency-coin__step" onClick={() => step(coin.key, -1)} aria-label={`Remove ${coin.abbr}`} disabled={amounts[coin.key] <= 0}>−</button>
          )}
        </div>
      ))}

      {showModal && (
        <CurrencyModal
          amounts={amounts}
          onApply={(next) => { onChange(next); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function CurrencyModal({ amounts, onApply, onClose }: {
    amounts: CurrencyAmounts;
    onApply: (amounts: CurrencyAmounts) => void;
    onClose: () => void;
    }) {
    // Working copy of the set values
    const [vals, setVals] = useState<Record<string, string>>(
        Object.fromEntries(COINS.map((c) => [c.key, amounts[c.key].toString()]))
    );
    // Per-coin delta fields
    const [deltas, setDeltas] = useState<Record<string, string>>(
        Object.fromEntries(COINS.map((c) => [c.key, '']))
    );

    const applyDelta = (key: string) => {
        const d = Number(deltas[key]) || 0;
        const next = Math.max(0, (Number(vals[key]) || 0) + d);
        setVals((v) => ({ ...v, [key]: next.toString() }));
        setDeltas((dl) => ({ ...dl, [key]: '' }));
    };

    const save = () => {
        const result = Object.fromEntries(
        COINS.map((c) => [c.key, Math.max(0, Number(vals[c.key]) || 0)])
        ) as CurrencyAmounts;
        onApply(result);
    };

    const [viewAs, setViewAs] = useState<CoinType['key']>('gold');

    const workingAmounts: CurrencyAmounts = Object.fromEntries(
        COINS.map((c) => [c.key, Math.max(0, Number(vals[c.key]) || 0)])
    ) as CurrencyAmounts;

    const breakdown = convertCurrency(workingAmounts, viewAs);

    return (
        <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Currency</h2>
            <div className="currency-convert">
                <div className="currency-convert__header">
                    <span>View total as</span>
                    <select value={viewAs} onChange={(e) => setViewAs(e.target.value as CoinType['key'])}>
                    {COINS.map((c) => (
                        <option key={c.key} value={c.key}>{c.abbr}</option>
                    ))}
                    </select>
                </div>
                <div className="currency-convert__result">
                    {breakdown.length === 0 ? (
                    <span className="currency-convert__empty">No coins</span>
                    ) : (
                    breakdown.map((b) => (
                        <span key={b.key} className="currency-convert__coin" style={{ color: b.color }}>
                        <i className="fa-light fa-coins" /> {b.count} {b.abbr}
                        </span>
                    ))
                    )}
                </div>
            </div>
            <div className="currency-modal__grid">
            {COINS.map((coin) => (
                <div key={coin.key} className="currency-modal__row">
                <span className="currency-modal__label" style={{ color: coin.color }}>
                    <i className="fa-light fa-coins" /> {coin.abbr}
                </span>
                <input
                    className="currency-modal__set"
                    value={vals[coin.key]}
                    onChange={(e) => setVals((v) => ({ ...v, [coin.key]: e.target.value }))}
                    aria-label={`Set ${coin.abbr}`}
                />
                <div className="currency-modal__delta">
                    <input
                    value={deltas[coin.key]}
                    onChange={(e) => setDeltas((d) => ({ ...d, [coin.key]: e.target.value }))}
                    placeholder="±"
                    onKeyDown={(e) => { if (e.key === 'Enter') applyDelta(coin.key); }}
                    />
                    <button className="currency-modal__apply" onClick={() => applyDelta(coin.key)}>Apply</button>
                </div>
                </div>
            ))}
            </div>

            <div className="modal__actions">
            <button className="modal__btn modal__btn--secondary" onClick={onClose}>Cancel</button>
            <button className="modal__btn modal__btn--primary" onClick={save}>Save</button>
            </div>
        </div>
        </div>
    );
}