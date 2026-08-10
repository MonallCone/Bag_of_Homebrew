import type { Item } from '../../Types/model';

interface Props {
  item: Item;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ item, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Delete item?</h2>
        <p className="confirm-delete__text">
          <strong>{item.name}</strong> will be permanently deleted. This can't be undone.
        </p>
        <div className="modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}