import '../../styles/Inventory.css';
import '../../styles/Settings.css';
import { useState } from 'react';
import { PrivacyPolicy } from '../Marketing/PrivacyPolicy';

interface CharacterSummary { id: string; name: string; portraitUrl: string | null; }
interface CampaignSummary { id: string; name: string; inviteCode: string; vaultId: string; isGm: boolean; }
type Tab = 'account' | 'privacy' | 'advanced';

interface Props {
  email: string; displayName: string; vaultName: string;
  characters: CharacterSummary[]; campaigns: CampaignSummary[];
  onRenameVault: () => void;
  onRenameCharacter: (id: string, currentName: string) => void;
  onDeleteCharacter: (id: string, name: string) => void;
  onRenameCampaign: (id: string, name: string) => void;
  onDeleteCampaign: (id: string, name: string) => void;
  onLeaveCampaign: (id: string, name: string) => void;
  onClose: () => void;
}

export function SettingsModal({ email, displayName, vaultName, characters, campaigns, onRenameVault, onRenameCharacter, onDeleteCharacter, onRenameCampaign, onDeleteCampaign, onLeaveCampaign, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h2 className="modal__title settings-modal__title">Settings</h2>
          <button className="settings-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="category-tabs settings-page__tabs">
          <button className={`category-tabs__tab ${tab === 'account' ? 'category-tabs__tab--active' : ''}`} onClick={() => setTab('account')}>Account</button>
          <button className={`category-tabs__tab ${tab === 'privacy' ? 'category-tabs__tab--active' : ''}`} onClick={() => setTab('privacy')}>Privacy Policy</button>
          <button className={`category-tabs__tab ${tab === 'advanced' ? 'category-tabs__tab--active' : ''}`} onClick={() => setTab('advanced')}>Advanced</button>
        </div>
        <div className="settings-page__body">
          {tab === 'account' && (
            <>
              <div className="settings-page__identity">
                <span className="settings-page__email">{email}</span>
                <span className="settings-page__display-name">{displayName}</span>
              </div>
              <section className="settings-section">
                <h2 className="settings-section__title">Vault</h2>
                <div className="settings-section__row">
                  <span className="settings-section__label">{vaultName}</span>
                  <button className="settings-section__action" onClick={onRenameVault}>Rename</button>
                </div>
              </section>
              <section className="settings-section">
                <h2 className="settings-section__title">Character{characters.length === 1 ? '' : 's'}</h2>
                {characters.length === 0 ? <p className="settings-section__empty">No characters yet.</p> : characters.map((c) => (
                  <div key={c.id} className="settings-section__row">
                    <span className="settings-section__label">{c.name}</span>
                    <div className="settings-section__actions">
                      <button className="settings-section__action" onClick={() => onRenameCharacter(c.id, c.name)}>Rename</button>
                      <button className="settings-section__action settings-section__action--danger" onClick={() => onDeleteCharacter(c.id, c.name)}>Delete</button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="settings-section">
                <h2 className="settings-section__title">Campaigns</h2>
                {campaigns.length === 0 ? <p className="settings-section__empty">No campaigns yet.</p> : campaigns.map((c) => (
                  <div key={c.id} className="settings-section__row">
                    <span className="settings-section__label">{c.isGm ? '👑 ' : '⚔️ '}{c.name}</span>
                    <div className="settings-section__actions">
                      {c.isGm ? (<><button className="settings-section__action" onClick={() => onRenameCampaign(c.id, c.name)}>Rename</button><button className="settings-section__action settings-section__action--danger" onClick={() => onDeleteCampaign(c.id, c.name)}>Delete</button></>) : (<button className="settings-section__action settings-section__action--danger" onClick={() => onLeaveCampaign(c.id, c.name)}>Leave</button>)}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
          {tab === 'privacy' && <PrivacyPolicy />}
          {tab === 'advanced' && (
            <section className="settings-section">
              <h2 className="settings-section__title">Advanced Settings</h2>
              <div className="settings-section__placeholder">
                <p>Under Development</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}