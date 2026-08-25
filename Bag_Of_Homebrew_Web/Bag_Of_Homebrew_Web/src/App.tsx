import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CharacterSheetPage } from './Components/CharacterSheet/CharacterSheetPage';
import { VaultView } from './Components/Vault/VaultView';
import { BurgerMenu } from './Components/Nav/BurgerMenu';
import './App.css';
import { NavPanel } from './Components/Nav/NavPanel';
import { NewCharacterModal } from './Components/Nav/NewCharacterModal';
import { RenameModal } from './Components/Nav/RenameModal';
import { DeleteCharacterModal } from './Components/Nav/DeleteCharacterModal';
import { CampaignView } from './Components/Campaign/CampaignView';
import { NewCampaignModal } from './Components/Campaign/NewCampaignModal';
import { JoinCampaignModal } from './Components/Campaign/JoinCampaignModal';
import { DeleteCampaignModal } from './Components/Nav/DeleteCampaignModal';
import { ConfirmLeaveModal } from './Components/Nav/ConfirmLeaveModal';
import { ToastProvider, useToast} from './Components/Toast/ToastProvider';
import { API_BASE } from './config';
import { LandingPage } from './Components/Marketing/LandingPage';

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
  const { showToast } = useToast();
  const [renameCampaignTarget, setRenameCampaignTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameVaultOpen, setRenameVaultOpen] = useState(false);
  const [vaultName, setVaultName] = useState('Dragon\u2019s Vault');

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { setSession(null); return; }
        setSession({ displayName: data.displayName, vaultId: data.vaultId, userId: data.id });
        setIsPaid(data.isPaid ?? false);
        setVaultName(data.vaultName ?? 'Dragon\u2019s Vault'); 
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
  if (!session) return <LandingPage />;

  const createCharacter = async (name: string) => {
    const res = await fetch(`${API_BASE}/api/characters`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      showToast(msg || 'Could not create character', 'error');
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
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      showToast(msg || 'Could not create campaign', 'error');
    }
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

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setSession(null);          // clears session → lands back on the landing page
    navigate('/');
  };

  const renameCampaign = async (id: string, name: string) => {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}/name`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Rename failed');
    loadCampaigns();
  };

  const renameVault = async (name: string) => {
    const res = await fetch(`${API_BASE}/api/vaults/${session.vaultId}/name`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Rename failed');
    setVaultName(name);
  };

  return (
    <>
      <BurgerMenu onClick={() => setMenuOpen(true)} />

      {menuOpen && (
          <NavPanel
            characters={characters}
            campaigns={campaigns}
            vaultId={session.vaultId}
            vaultName={vaultName}
            currentView={location.pathname}
            canAddCharacter={canAddCharacter}
            canCreateCampaign={true}
            onSelectVault={() => { navigate('/vault'); setMenuOpen(false); }}
            onRenameVault={() => { setMenuOpen(false); setRenameVaultOpen(true); }}
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
            onRenameCampaign={(id, name) => { setMenuOpen(false); setRenameCampaignTarget({ id, name }); }}
            onLogout={() => {setMenuOpen(false); logout();}}
            //onOpenSettings={() => { setMenuOpen(false); navigate('/settings'); }}
          />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/vault" replace />} />
        <Route
          path="/vault"
          element={<VaultView vaultId={session.vaultId} vaultName={vaultName} characters={characters} />}
        />
        <Route path="/character/:characterId" element={<CharacterRoute vaultId={session.vaultId} isPaid={isPaid} />} />
        <Route path="/campaign/:campaignId" element={<CampaignRoute currentUserId={session.userId} isPaid={isPaid}/>} />
        <Route path="/campaign/:campaignId/vault" element={<CampaignRoute currentUserId={session.userId} isPaid={isPaid}/>} />
        <Route path="/campaign/:campaignId/player/:userId" element={<CampaignRoute currentUserId={session.userId} isPaid={isPaid}/>} />
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

      {/* Character rename*/}
      {renameTarget && (
        <RenameModal
          title="Rename Character"
          currentName={renameTarget.name}
          onRename={(name) => renameCharacter(renameTarget.id, name)}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Campaign rename */}
      {renameCampaignTarget && (
        <RenameModal
          title="Rename Campaign"
          currentName={renameCampaignTarget.name}
          onRename={(name) => renameCampaign(renameCampaignTarget.id, name)}
          onClose={() => setRenameCampaignTarget(null)}
        />
      )}

      {/* Vault rename */}
      {renameVaultOpen && (
        <RenameModal
          title="Rename Vault"
          currentName={vaultName}
          onRename={renameVault}
          onClose={() => setRenameVaultOpen(false)}
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

function CharacterRoute({ vaultId, isPaid }: { vaultId: string, isPaid: boolean }) {
  const { characterId } = useParams();
  return <CharacterSheetPage key={characterId} characterId={characterId!} vaultId={vaultId} isPaid={isPaid}/>;
}

function CampaignRoute({ currentUserId, isPaid }: { currentUserId: string, isPaid: boolean}) {
  const { campaignId } = useParams();
  return <CampaignView key={campaignId} campaignId={campaignId!} currentUserId={currentUserId} isPaid={isPaid}/>;
}

export default App;