import { useState } from 'react';

interface CharacterSummary {
  id: string;
  name: string;
  portraitUrl: string | null;
}

interface CampaignSummary {
  id: string;
  name: string;
  inviteCode: string;
  vaultId: string;
  isGm: boolean;
}

interface Props {
  characters: CharacterSummary[];
  campaigns: CampaignSummary[];
  vaultId: string;
  currentView: string;
  canAddCharacter: boolean;
  canCreateCampaign: boolean;
  onSelectVault: () => void;
  onSelectCharacter: (id: string) => void;
  onSelectCampaign: (id: string) => void;
  onAddCharacter: () => void;
  onCreateCampaign: () => void;
  onJoinCampaign: () => void;
  onRenameCharacter: (id: string, currentName: string) => void;
  onDeleteCharacter: (id: string, name: string) => void;
  onClose: () => void;
  onDeleteCampaign: (id: string, name: string) => void;
  onLeaveCampaign: (id: string, name: string) => void;
}

export function NavPanel({
  characters,
  campaigns,
  currentView,
  canAddCharacter,
  canCreateCampaign,
  onSelectVault,
  onSelectCharacter,
  onSelectCampaign,
  onAddCharacter,
  onCreateCampaign,
  onJoinCampaign,
  onRenameCharacter,
  onDeleteCharacter,
  onClose,
  onLeaveCampaign,
  onDeleteCampaign
}: Props) {
  const [charMenu, setCharMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [campMenu, setCampMenu] = useState<{ id: string; name: string; isGm: boolean; x: number; y: number } | null>(null);

  return (
    <>
      <div className="nav-panel__backdrop" onClick={onClose} />

      <div className="nav-panel">
        <h2 className="nav-panel__heading">Menu</h2>

        <div className="nav-panel__section">
          <span className="nav-panel__label">Storage</span>
          <button
            className={`nav-panel__item ${currentView=== '/vault' ? 'nav-panel__item--active' : ''}`}
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
                  currentView.startsWith('/character/${c.id}') ? 'nav-panel__item--active' : ''
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

        <div className="nav-panel__section">
          <span className="nav-panel__label">Campaigns</span>

          {campaigns.length === 0 ? (
            <p className="nav-panel__empty">No campaigns yet.</p>
          ) : (
            campaigns.map((c) => (
              <button
                key={c.id}
                className={`nav-panel__item ${
                  currentView.startsWith('/campaign/${c.id}') ? 'nav-panel__item--active' : ''
                }`}
                onClick={() => onSelectCampaign(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCampMenu({id: c.id, name: c.name, isGm: c.isGm, x: e.clientX, y: e.clientY});
                }}
              >
                {c.isGm ? '👑 ' : '⚔️ '}{c.name}
              </button>
            ))
          )}

          <button className="nav-panel__add" onClick={onJoinCampaign}>
            + Join by Code
          </button>
          {canCreateCampaign && (
            <button className="nav-panel__add" onClick={onCreateCampaign}>
              + New Campaign
            </button>
          )}
        </div>
      </div>

      {charMenu && (
        <>
          <div
            className="context-menu-backdrop context-menu-backdrop--nav"
            onClick={() => setCharMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCharMenu(null);
            }}
          />
          <div className="context-menu context-menu--nav" style={{ top: charMenu.y, left: charMenu.x }}>
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

      {campMenu && (
      <>
        <div
          className="context-menu-backdrop context-menu-backdrop--nav"
          onClick={() => setCampMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setCampMenu(null); }}
        />
        <div className="context-menu context-menu--nav" style={{ top: campMenu.y, left: campMenu.x }}>
          {campMenu.isGm ? (
            <button
              className="context-menu__item context-menu__item--danger"
              onClick={() => { onDeleteCampaign(campMenu.id, campMenu.name); setCampMenu(null); }}
            >
              Delete Campaign
            </button>
          ) : (
            <button
              className="context-menu__item context-menu__item--danger"
              onClick={() => { onLeaveCampaign(campMenu.id, campMenu.name); setCampMenu(null); }}
            >
              Leave Campaign
            </button>
          )}
        </div>
      </> 
    )}
    </>
  );
}