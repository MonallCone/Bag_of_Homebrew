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

function DraggableSlot({ item, isSelected, onSelect, onContextMenu, onAdjustQuantity }: SlotProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inventory-slot ${rarityFrameClass(item)} ${isSelected ? 'inventory-slot--selected' : ''} ${
        isDragging ? 'inventory-slot--dragging' : ''
      }`}
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

      {item.isPlotFlagged && <span className="plot-dot" />}

      {item.category === 'Consumable' && onAdjustQuantity && (
        <div className="qty-stepper" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="qty-stepper__btn"
            onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, -1); }}
            disabled={(item.quantity ?? 0) <= 0}
          >−</button>
          <span className="qty-stepper__count">{item.quantity ?? 0}</span>
          <button
            className="qty-stepper__btn"
            onClick={(e) => { e.stopPropagation(); onAdjustQuantity(item.id, 1); }}
          >+</button>
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