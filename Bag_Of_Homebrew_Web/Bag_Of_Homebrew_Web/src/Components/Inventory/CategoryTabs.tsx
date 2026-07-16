import type { ItemCategory } from '../../Types/model';

type TabValue = 'All' | ItemCategory | 'PlotItems';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Weapon', label: 'Weapons' },
  { value: 'Armour', label: 'Armour' },
  { value: 'Consumable', label: 'Consumables' },
  { value: 'Misc', label: 'Misc' },
  { value: 'PlotItems', label: 'Plot Items' },
];

interface Props {
  active: TabValue;
  onChange: (tab: TabValue) => void;
}

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="category-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          className={`category-tabs__tab ${active === tab.value ? 'category-tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}