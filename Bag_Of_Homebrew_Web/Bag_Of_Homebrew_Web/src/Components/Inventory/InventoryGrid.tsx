import type { Item } from '../../Types/model';

const GRID_SIZE = 50; // 5 columns x 10 rows

interface Props {
  items: Item[];
  selectedItemId: string | null;
  onSelect: (item: Item) => void;
}

export function InventoryGrid({ items, selectedItemId, onSelect }: Props) {
  const slots = Array.from({ length: GRID_SIZE }, (_, i) => items[i] ?? null);

  return (
    <div className="inventory-slot-grid">
      {slots.map((item, i) => (
        <div
          key={item?.id ?? `empty-${i}`}
          className={`inventory-slot ${item ? '' : 'inventory-slot--empty'} ${
            item && item.id === selectedItemId ? 'inventory-slot--selected' : ''
          }`}
          onClick={() => item && onSelect(item)}
        >
          {item ? (
            item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} />
            ) : (
              <div className="inventory-slot__placeholder" />
            )
          ) : null}
        </div>
      ))}
    </div>
  );
}