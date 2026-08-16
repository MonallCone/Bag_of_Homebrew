import type { ItemUsage } from '../../api/itemUsage';

interface Props {
  usage: ItemUsage | null;
}

export function ItemUsageIndicator({ usage }: Props) {
  // Only show for free users (paid = unlimited, nothing to indicate)
  if (!usage || usage.limit === null) return null;

  const { count, limit } = usage;
  const nearFull = count >= limit * 0.9;
  const full = count >= limit;

  return (
    <div className={`item-usage ${full ? 'item-usage--full' : nearFull ? 'item-usage--near' : ''}`}>
      <i className="fa-solid fa-box" />
      <span className="item-usage__count">{count} / {limit}</span>
      <span className="item-usage__tooltip">
        Free accounts can store up to {limit} items across your character and vault.
        Upgrade for unlimited storage.
      </span>
    </div>
  );
}