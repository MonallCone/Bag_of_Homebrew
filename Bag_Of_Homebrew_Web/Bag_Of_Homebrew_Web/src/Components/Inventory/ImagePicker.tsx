import { useState } from 'react';
import { imageSrc } from '../../api/images';
import { ImagePickerModal } from './ImagePickerModal';
import type { ItemRarity } from '../../Types/model';
import { rarityFrameClassFor } from './rarityStyles';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  rarity: ItemRarity;
}

export function ImagePicker({ value, onChange, rarity }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`item-form__image-btn ${rarityFrameClassFor(rarity)}`}
        onClick={() => setOpen(true)}
      >
        {value ? <img src={imageSrc(value)} alt="Selected" /> : <span className="image-picker__none">—</span>}
      </button>
      {open && <ImagePickerModal value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}