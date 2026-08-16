import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { ToastProvider } from './Components/Toast/ToastProvider';

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

function App(){
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ToastProvider>
  )
}

function AppShell() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { setSession(null); return; }
        setSession({ displayName: data.displayName, vaultId: data.vaultId, userId: data.id });
        setIsPaid(data.isPaid ?? false);
      })
      .catch(() => setSession(null));
  }, []);

  const loadCharacters = () => {
    fetch(`${API_BASE}/api/characters`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then(setCharacters);
  };
  const loadCampaigns = () => {
    fetch(`${API_BASE}/api/campaigns`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : [])).then(setCampaigns);
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
    navigate(`/character/${created.id}`); // jump to the new character
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
    if (location.pathname.includes('/character/${id}')) navigate('/vault');      
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
    navigate(`/campaign/${created.id}`);  
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
    navigate(`/campaign/${joined.campaignId}/player/${joined.userId}`); 
  };

  const deleteCampaign = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      if (location.pathname.includes('/campaign/${id}')) navigate('/vault');  
      loadCampaigns();
    }
  };

  const leaveCampaign = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}/leave`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      if (location.pathname.includes('/campaign/${id}')) navigate('/vault');  
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
            currentView={location.pathname}
            canAddCharacter={canAddCharacter}
            canCreateCampaign={isPaid}
            onSelectVault={() => { navigate('/vault'); setMenuOpen(false); }}
            onSelectCharacter={(id) => { navigate(`/character/${id}`);  setMenuOpen(false); }}
            onSelectCampaign={(id) => { navigate(`/campaign/${id}`);   setMenuOpen(false); }}
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

      <Routes>
        <Route path="/" element={<Navigate to="/vault" replace />} />
        <Route
          path="/vault"
          element={<VaultView vaultId={session.vaultId} vaultName="Dragon's Vault" characters={characters} />}
        />
        <Route path="/character/:characterId" element={<CharacterRoute vaultId={session.vaultId} />} />
        <Route path="/campaign/:campaignId" element={<CampaignRoute currentUserId={session.userId} />} />
        <Route path="/campaign/:campaignId/vault" element={<CampaignRoute currentUserId={session.userId} />} />
        <Route path="/campaign/:campaignId/player/:userId" element={<CampaignRoute currentUserId={session.userId} />} />
        <Route path="*" element={<Navigate to="/vault" replace />} />
      </Routes>

      {showNewCharacter && (
        <NewCharacterModal
          onCreate={createCharacter}
          onClose={() => setShowNewCharacter(false)}
        />
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

function CharacterRoute({ vaultId }: { vaultId: string }) {
  const { characterId } = useParams();
  return <CharacterSheetPage key={characterId} characterId={characterId!} vaultId={vaultId} />;
}

function CampaignRoute({ currentUserId }: { currentUserId: string }) {
  const { campaignId } = useParams();
  return <CampaignView key={campaignId} campaignId={campaignId!} currentUserId={currentUserId} />;
}

export default App;