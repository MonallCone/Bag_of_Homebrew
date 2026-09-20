import { useEffect, useMemo, useState } from 'react';
import { fetchDefaultImages, uploadImage, imageSrc, type DefaultImage } from '../../api/images';
import type { ItemCategory } from '../../Types/model';

const CATEGORY_TABS: { value: ItemCategory; label: string }[] = [
  { value: 'Weapon', label: 'Weapons' },
  { value: 'Armour', label: 'Armour' },
  { value: 'Accessory', label: 'Accessories' },
  { value: 'Consumable', label: 'Consumables' },
  { value: 'Misc', label: 'Misc' },
];

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  onClose: () => void;
}

export function ImagePickerModal({ value, onChange, onClose }: Props) {
  const [images, setImages] = useState<DefaultImage[]>([]);
  const [activeTab, setActiveTab] = useState<ItemCategory>('Weapon');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchDefaultImages().then(setImages); }, []);

  const visibleImages = useMemo(
    () => images.filter((i) => i.category === activeTab),
    [images, activeTab]
  );

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, 'items');
      onChange(url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title image-picker-modal__title">Choose an image</h2>

        <div className="category-tabs image-picker-modal__tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`category-tabs__tab ${activeTab === tab.value ? 'category-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="image-picker-modal__body">
          <div className="image-picker-modal__gallery">
            <button
              type="button"
              className={`image-picker__option ${value === null ? 'image-picker__option--selected' : ''}`}
              onClick={() => { onChange(null); onClose(); }}
            >
              <span className="image-picker__none">—</span>
            </button>

            {visibleImages.map((img) => (
              <button
                type="button"
                key={img.url}
                className={`image-picker__option ${value === img.url ? 'image-picker__option--selected' : ''}`}
                onClick={() => { onChange(img.url); onClose(); }}
              >
                <img src={imageSrc(img.url)} alt="" />
              </button>
            ))}
          </div>

          {visibleImages.length === 0 && (
            <p className="image-picker-modal__empty">No {activeTab.toLowerCase()} images yet — upload one below.</p>
          )}

          <label className="image-picker__upload-row">
            <span>Or upload your own</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>

          {error && <p className="modal__error">{error}</p>}
        </div>

        <div className="modal__actions image-picker-modal__actions">
          <button className="modal__btn modal__btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}