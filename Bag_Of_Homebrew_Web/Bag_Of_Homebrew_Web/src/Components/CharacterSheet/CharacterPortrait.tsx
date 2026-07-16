interface Props {
  portraitUrl?: string;
  characterName: string;
}

export function CharacterPortrait({ portraitUrl, characterName }: Props) {
  return (
    <div className="character-portrait">
      {portraitUrl ? (
        <img src={portraitUrl} alt={characterName} />
      ) : (
        <div className="character-portrait__placeholder">No portrait</div>
      )}
    </div>
  );
}