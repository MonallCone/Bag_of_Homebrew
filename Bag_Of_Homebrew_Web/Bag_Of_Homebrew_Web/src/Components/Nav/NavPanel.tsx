import { useState } from 'react';

interface CharacterSummary {
  id: string;
  name: string;
  portraitUrl: string | null;
}

type View = { kind: 'vault' } | { kind: 'character'; id: string };

interface Props {
  characters: CharacterSummary[];
  vaultId: string;
  currentView: View;
  canAddCharacter: boolean;
  onSelectVault: () => void;
  onSelectCharacter: (id: string) => void;
  onAddCharacter: () => void;
  onRenameCharacter: (id: string, currentName: string) => void;
  onDeleteCharacter: (id: string, name: string) => void;
  onClose: () => void;
}

export function NavPanel({
  characters,
  currentView,
  canAddCharacter,
  onSelectVault,
  onSelectCharacter,
  onAddCharacter,
  onRenameCharacter,
  onDeleteCharacter,
  onClose,
}: Props) {
  const [charMenu, setCharMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null);

  return (
    <>
      <div className="nav-panel__backdrop" onClick={onClose} />

      <div className="nav-panel">
        <h2 className="nav-panel__heading">Menu</h2>

        <div className="nav-panel__section">
          <span className="nav-panel__label">Storage</span>
          <button
            className={`nav-panel__item ${currentView.kind === 'vault' ? 'nav-panel__item--active' : ''}`}
            onClick={onSelectVault}
          >
            🐉 Dragon's Vault
          </button>
        </div>

        <div className="nav-panel__section">
          <span className="nav-panel__label">Characters</span>

          {characters.length === 0 ? (
            <p className="nav-panel__empty">No characters yet.</p>
          ) : (
            characters.map((c) => (
              <button
                key={c.id}
                className={`nav-panel__item ${
                  currentView.kind === 'character' && currentView.id === c.id ? 'nav-panel__item--active' : ''
                }`}
                onClick={() => onSelectCharacter(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCharMenu({ id: c.id, name: c.name, x: e.clientX, y: e.clientY });
                }}
              >
                {c.name}
              </button>
            ))
          )}

          {canAddCharacter && (
            <button className="nav-panel__add" onClick={onAddCharacter}>
              + New Character
            </button>
          )}
        </div>
      </div>

      {charMenu && (
        <>
          <div
            className="context-menu-backdrop"
            onClick={() => setCharMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCharMenu(null);
            }}
          />
          <div className="context-menu" style={{ top: charMenu.y, left: charMenu.x }}>
            <button
              className="context-menu__item"
              onClick={() => {
                onRenameCharacter(charMenu.id, charMenu.name);
                setCharMenu(null);
              }}
            >
              Rename
            </button>
            <div className="context-menu__divider" />
            <button
              className="context-menu__item context-menu__item--danger"
              onClick={() => {
                onDeleteCharacter(charMenu.id, charMenu.name);
                setCharMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}