import { useDraggable } from '@dnd-kit/core';
import type { Item } from '../../Types/model';
import {imageSrc} from '../../api/images'
import { rarityFrameClass } from './rarityStyles';

const GRID_SIZE = 50;

interface SlotProps {
  item: Item;
  isSelected: boolean;
  onSelect: (item: Item) => void;
  onContextMenu: (item: Item, x: number, y: number) => void;
  onAdjustQuantity?: (itemId: string, delta: number) => void;
}

  export function DraggableSlot({ item, isSelected, onSelect, onContextMenu, onAdjustQuantity }: SlotProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: item.id,
      // Don't let pending items be dragged into equipment slots
      disabled: !!item.__pendingIncoming || !!item.__pendingOutgoing,
    });

    const classes = [
      'inventory-slot',
      rarityFrameClass(item),
      isSelected ? 'inventory-slot--selected' : '',
      isDragging ? 'inventory-slot--dragging' : '',
      item.__pendingIncoming ? 'inventory-slot--pending-in' : '',
      item.__pendingOutgoing ? 'inventory-slot--pending-out' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={classes}
        onClick={() => onSelect(item)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(item, e.clientX, e.clientY);
        }}
      >
        {item.imageUrl ? (
          <img src={imageSrc(item.imageUrl)} alt={item.name} draggable={false} />
        ) : (
          <div className="inventory-slot__placeholder" />
        )}

        {/* Rarity/plot indicators */}
        {item.isPlotFlagged && <span className="plot-dot" />}

        {/* Incoming gift — present icon */}
        {item.__pendingIncoming && (
          <span className="pending-badge pending-badge--in" title="Incoming gift">
            <i className="fa-solid fa-gift"></i>
          </span>
        )}

        {/* Outgoing pending — clock icon */}
        {item.__pendingOutgoing && (
          <span className="pending-badge pending-badge--out" title="Awaiting recipient">
            <i className="fa-regular fa-hourglass-half"></i>
          </span>
        )}

        {/* Consumable quantity stepper */}
        {item.category === 'Consumable' && onAdjustQuantity && (
          <div className="qty-stepper" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className="qty-stepper__btn"
              onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, -1); }}
              disabled={(item.quantity ?? 0) <= 0}
            >
              −
            </button>
            <span className="qty-stepper__count">{item.quantity ?? 0}</span>
            <button
              className="qty-stepper__btn"
              onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, 1); }}
            >
              +
            </button>
          </div>
        )}
      </div>
    );
}

interface Props {
  items: Item[];
  selectedItemId: string | null;
  onSelect: (item: Item) => void;
  onContextMenu: (item: Item, x: number, y: number) => void;
  onAdjustQuantity?: (itemId: string, delta: number) => void;
}

export function InventoryGrid({ items, selectedItemId, onSelect, onContextMenu, onAdjustQuantity }: Props) {
  const slots = Array.from({ length: GRID_SIZE }, (_, i) => items[i] ?? null);

  return (
    <div className="inventory-slot-grid">
      {slots.map((item, i) =>
        item ? (
          <DraggableSlot
            key={item.id}
            item={item}
            isSelected={item.id === selectedItemId}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            onAdjustQuantity={onAdjustQuantity}
          />
        ) : (
          <div key={`empty-${i}`} className="inventory-slot inventory-slot--empty" />
        )
      )}
    </div>
  );
}