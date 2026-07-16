import type { Item } from '../../Types/model';

interface Props {
  item: Item;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onClose }: Props) {
  return (
    <div className="item-detail-panel">
      <button className="item-detail-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h3 className="item-detail-panel__name">{item.name}</h3>
      <div className="item-detail-panel__rule" />
      <div className="item-detail-panel__meta">
        {item.rarity} {item.category}
        {item.isPlotFlagged && <span className="item-detail-panel__plot-flag">Plot Item</span>}
      </div>

      {item.homebrewDescription && (
        <p className="item-detail-panel__description">{item.homebrewDescription}</p>
      )}

      <dl className="item-detail-panel__properties">
        {Object.entries(item.properties).map(([key, value]) => (
          <div key={key} className="item-detail-panel__property">
            <dt>{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}