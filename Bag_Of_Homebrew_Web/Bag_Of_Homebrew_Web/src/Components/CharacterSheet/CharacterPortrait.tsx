import { useRef, useState } from 'react';
import { uploadImage, imageSrc } from '../../api/images';

interface Props {
  portraitUrl: string | null;
  characterName: string;
  onPortraitChange: (url: string) => void;
}

export function CharacterPortrait({ portraitUrl, characterName, onPortraitChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, 'portraits');
      onPortraitChange(url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="character-portrait character-portrait--clickable"
      onClick={() => fileInputRef.current?.click()}
      title="Click to set portrait"
    >
      {portraitUrl ? (
        <img src={imageSrc(portraitUrl)} alt={characterName} />
      ) : (
        <div className="character-portrait__placeholder">
          {uploading ? 'Uploading…' : 'Click to add portrait'}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}