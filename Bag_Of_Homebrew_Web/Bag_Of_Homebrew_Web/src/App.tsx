import { useEffect, useState } from 'react';
import { CharacterSheetPage } from './Components/CharacterSheet/CharacterSheetPage';
import { VaultView } from './Components/Vault/VaultView';
import { BurgerMenu } from './Components/Nav/BurgerMenu';
import './App.css';
import { NavPanel } from './Components/Nav/NavPanel';
import { NewCharacterModal } from './Components/Nav/NewCharacterModal';
import { RenameCharacterModal } from './Components/Nav/RenameCharacterModal';
import { DeleteCharacterModal } from './Components/Nav/DeleteCharacterModal';
import { CampaignView } from './Components/Campaign/CampaignView';
import { NewCampaignModal } from './Components/Campaign/NewCampaignModal';
import { JoinCampaignModal } from './Components/Campaign/JoinCampaignModal';
import { DeleteCampaignModal } from './Components/Nav/DeleteCampaignModal';
import { ConfirmLeaveModal } from './Components/Nav/ConfirmLeaveModal';

const API_BASE = 'https://localhost:7238';

interface Session {
  displayName: string;
  vaultId: string;
  userId: string;
}

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

// What's currently on screen
type View =
  | { kind: 'vault' }
  | { kind: 'character'; id: string }
  | { kind: 'campaign'; id: string };

function App() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [view, setView] = useState<View>({ kind: 'vault' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showJoinCampaign, setShowJoinCampaign] = useState(false);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaveCampaignTarget, setLeaveCampaignTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { setSession(null); return; }
        setSession({ displayName: data.displayName, vaultId: data.vaultId, userId: data.id });
        setIsPaid(data.isPaid ?? false);        // ← add this line
        if (data.characterId) setView({ kind: 'character', id: data.characterId });
      })
      .catch(() => setSession(null));
  }, []);

  const loadCharacters = () => {
    fetch(`${API_BASE}/api/characters`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then(setCharacters);
  };

  const loadCampaigns = () => {
    fetch(`${API_BASE}/api/campaigns`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then(setCampaigns);
  };

  useEffect(() => {
    if (session && session !== 'loading') { loadCharacters(); loadCampaigns(); }
  }, [session]);

  if (session === 'loading') return <p>Checking session...</p>;
  if (!session) return <a href={`${API_BASE}/api/auth/login`}>Login with Google</a>;

  const createCharacter = async (name: string) => {
    const res = await fetch(`${API_BASE}/api/characters`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || 'Create failed');
    }
    const created = await res.json();
    loadCharacters();                        // refresh the menu list
    setView({ kind: 'character', id: created.id }); // jump to the new character
  };

  const canAddCharacter = isPaid || characters.length === 0;

  const renameCharacter = async (id: string, name: string) => {
    const res = await fetch(`${API_BASE}/api/characters/${id}/name`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Rename failed');
    loadCharacters(); // refresh the menu; if the renamed one is active, remount picks it up
  };

  const deleteCharacter = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/characters/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Delete failed');
    // If the deleted character was on screen, fall back to the vault
    if (view.kind === 'character' && view.id === id) setView({ kind: 'vault' });
    loadCharacters();
  };

  const createCampaign = async (name: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { const m = await res.text().catch(() => ''); throw new Error(m || 'Create failed'); }
    const created = await res.json();
    loadCampaigns();
    setView({ kind: 'campaign', id: created.id });
  };

  const joinCampaign = async (inviteCode: string, characterId: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/join`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, characterId }),
    });
    if (!res.ok) { const m = await res.text().catch(() => ''); throw new Error(m || 'Join failed'); }
    const joined = await res.json();
    loadCampaigns();
    setView({ kind: 'campaign', id: joined.id });
  };

  const deleteCampaign = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      if (view.kind === 'campaign' && view.id === id) setView({ kind: 'vault' });
      loadCampaigns();
    }
  };

  const leaveCampaign = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}/leave`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      if (view.kind === 'campaign' && view.id === id) setView({ kind: 'vault' });
      loadCampaigns();
    }
  };

  return (
    <>
      <BurgerMenu onClick={() => setMenuOpen(true)} />

      {menuOpen && (
          <NavPanel
            characters={characters}
            campaigns={campaigns}
            vaultId={session.vaultId}
            currentView={view}
            canAddCharacter={canAddCharacter}
            canCreateCampaign={isPaid}
            onSelectVault={() => { setView({ kind: 'vault' }); setMenuOpen(false); }}
            onSelectCharacter={(id) => { setView({ kind: 'character', id }); setMenuOpen(false); }}
            onSelectCampaign={(id) => { setView({ kind: 'campaign', id }); setMenuOpen(false); }}
            onAddCharacter={() => { setMenuOpen(false); setShowNewCharacter(true); }}
            onCreateCampaign={() => { setMenuOpen(false); setShowCreateCampaign(true); }}
            onJoinCampaign={() => { setMenuOpen(false); setShowJoinCampaign(true); }}
            onRenameCharacter={(id, name) => { setMenuOpen(false); setRenameTarget({ id, name }); }}
            onDeleteCharacter={(id, name) => { setMenuOpen(false); setDeleteTarget({ id, name }); }}
            onClose={() => setMenuOpen(false)}
            onDeleteCampaign={(id, name) => { setMenuOpen(false); setDeleteCampaignTarget({ id, name }); }}
            onLeaveCampaign={(id, name) => { setMenuOpen(false); setLeaveCampaignTarget({ id, name }); }}
          />
      )}

      {showNewCharacter && (
        <NewCharacterModal
          onCreate={createCharacter}
          onClose={() => setShowNewCharacter(false)}
        />
      )}

      {view.kind === 'vault' && (
        <VaultView vaultId={session.vaultId} vaultName="Dragon's Vault" characters={characters} />
      )}
      {view.kind === 'character' && (
        <CharacterSheetPage key={view.id} characterId={view.id} vaultId={session.vaultId} />
      )}
      {view.kind === 'campaign' && (
        <CampaignView key={view.id} campaignId={view.id} currentUserId={session.userId} />
      )}

      {showCreateCampaign && (
        <NewCampaignModal onCreate={createCampaign} onClose={() => setShowCreateCampaign(false)} />
      )}
      {showJoinCampaign && (
        <JoinCampaignModal characters={characters} onJoin={joinCampaign} onClose={() => setShowJoinCampaign(false)} />
      )}

      {renameTarget && (
      <RenameCharacterModal
        currentName={renameTarget.name}
        onRename={(name) => renameCharacter(renameTarget.id, name)}
        onClose={() => setRenameTarget(null)}
      />
    )}

    {deleteTarget && (
      <DeleteCharacterModal
        characterName={deleteTarget.name}
        onConfirm={() => deleteCharacter(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    )}

    {deleteCampaignTarget && (
      <DeleteCampaignModal
        campaignName={deleteCampaignTarget.name}
        onConfirm={() => deleteCampaign(deleteCampaignTarget.id)}
        onClose={() => setDeleteCampaignTarget(null)}
      />
    )}
    {leaveCampaignTarget && (
      <ConfirmLeaveModal
        campaignName={leaveCampaignTarget.name}
        onConfirm={() => leaveCampaign(leaveCampaignTarget.id)}
        onClose={() => setLeaveCampaignTarget(null)}
      />
    )}
    </>
  );
}

export default App;