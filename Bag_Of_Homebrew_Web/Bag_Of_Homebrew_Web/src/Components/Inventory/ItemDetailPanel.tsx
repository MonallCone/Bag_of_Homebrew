import type { Item } from '../../Types/model';
import { imageSrc } from '../../api/images';
import ReactMarkdown from 'react-markdown';

interface Props {
  item: Item;
  onClose: () => void;
}

// helper near the top of the file
function formatHandedness(h: string | undefined): string | null {
  switch (h) {
    case 'OneHanded': return 'One-handed';
    case 'TwoHanded': return 'Two-handed';
    case 'Versatile': return 'Versatile';
    default: return null;
  }
}

export function ItemDetailPanel({ item, onClose }: Props) {
  return (
    <div className="item-detail-panel">
      <button className="item-detail-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <h3 className="item-detail-panel__name">{item.name}</h3>
      <div className={`item-detail-panel__rule item-detail-panel__rule--${item.rarity.toLowerCase()}`} />
      <div className="item-detail-panel__meta">
        {item.rarity} {item.category}
        {item.isPlotFlagged && <span className="item-detail-panel__plot-flag">Plot Item</span>}
      </div>

      <dl className="item-detail-panel__properties">
          {Object.entries(item.properties)
            .filter(([key]) => !['handedness', 'attackMod', 'damageMod', 'range'].includes(key))
            .map(([key, value]) => {
            // For the weapon "properties" field, append handedness inline
            if (key === 'properties') {
              const handed = formatHandedness(item.properties['handedness'] as string | undefined);
              const combined = [String(value), handed].filter(Boolean).join(', ');
              return (
                <div key={key} className="item-detail-panel__property">
                  <dt>{key}</dt>
                  <dd>{combined || '—'}</dd>
                </div>
              );
            }
            return (
              <div key={key} className="item-detail-panel__property">
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            );
          })}
      </dl>

      <div className="item-detail-panel__body">
        {item.imageUrl && (
          <img className="item-detail-panel__image" src={imageSrc(item.imageUrl)} alt={item.name} />
        )}
        {item.homebrewDescription && (
          <div className="item-detail-panel__description">
            <ReactMarkdown>{item.homebrewDescription}</ReactMarkdown>
          </div>
        )}
      </div>

    </div>
  );
}