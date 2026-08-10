import { useEffect, useRef, useState } from 'react';
import { fetchDefaultImages, uploadImage, imageSrc } from '../../api/images';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ImagePicker({ value, onChange }: Props) {
  const [defaults, setDefaults] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDefaultImages().then(setDefaults);
  }, []);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, 'items');
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-picker">
      <span className="image-picker__label">Item image</span>

      <div className="image-picker__gallery">
        {/* "None" option */}
        <button
          type="button"
          className={`image-picker__option ${value === null ? 'image-picker__option--selected' : ''}`}
          onClick={() => onChange(null)}
          title="No image"
        >
          <span className="image-picker__none">—</span>
        </button>

        {defaults.map((url) => (
          <button
            type="button"
            key={url}
            className={`image-picker__option ${value === url ? 'image-picker__option--selected' : ''}`}
            onClick={() => onChange(url)}
          >
            <img src={imageSrc(url)} alt="" />
          </button>
        ))}

        {/* Upload tile */}
        <button
          type="button"
          className="image-picker__option image-picker__upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload your own"
        >
          {uploading ? '…' : '+'}
        </button>
      </div>

      {/* Preview of a custom upload (not in the defaults list) */}
      {value && !defaults.includes(value) && (
        <div className="image-picker__custom-preview">
          <img src={imageSrc(value)} alt="Selected" />
          <span>Custom upload</span>
        </div>
      )}

      {error && <p className="modal__error">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}