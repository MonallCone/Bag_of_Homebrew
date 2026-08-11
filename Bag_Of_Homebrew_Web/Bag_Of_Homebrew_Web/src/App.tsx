import { useEffect, useState } from 'react';
import { CharacterSheetPage } from './Components/CharacterSheet/CharacterSheetPage';
import { VaultView } from './Components/Vault/VaultView';
import { BurgerMenu } from './Components/Nav/BurgerMenu';
import './App.css';
import { NavPanel } from './Components/Nav/NavPanel';
import { NewCharacterModal } from './Components/Nav/NewCharacterModal';
import { RenameCharacterModal } from './Components/Nav/RenameCharacterModal';
import { DeleteCharacterModal } from './Components/Nav/DeleteCharacterModal';

const API_BASE = 'https://localhost:7238';

interface Session {
  displayName: string;
  vaultId: string;
}

interface CharacterSummary {
  id: string;
  name: string;
  portraitUrl: string | null;
}

// What's currently on screen
type View =
  | { kind: 'vault' }
  | { kind: 'character'; id: string };

function App() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [view, setView] = useState<View>({ kind: 'vault' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewCharacter, setShowNewCharacter] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { setSession(null); return; }
        setSession({ displayName: data.displayName, vaultId: data.vaultId });
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

  useEffect(() => {
    if (session && session !== 'loading') loadCharacters();
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

  return (
    <>
      <BurgerMenu onClick={() => setMenuOpen(true)} />

      {menuOpen && (
        <NavPanel
          characters={characters}
          vaultId={session.vaultId}
          currentView={view}
          canAddCharacter={canAddCharacter}
          onSelectVault={() => { setView({ kind: 'vault' }); setMenuOpen(false); }}
          onSelectCharacter={(id) => { setView({ kind: 'character', id }); setMenuOpen(false); }}
          onAddCharacter={() => { setMenuOpen(false); setShowNewCharacter(true); }}
          onClose={() => setMenuOpen(false)}
          onRenameCharacter={(id, name) => { setMenuOpen(false); setRenameTarget({ id, name }); }}
          onDeleteCharacter={(id, name) => { setMenuOpen(false); setDeleteTarget({ id, name }); }}
        />
      )}

      {showNewCharacter && (
        <NewCharacterModal
          onCreate={createCharacter}
          onClose={() => setShowNewCharacter(false)}
        />
      )}

      {view.kind === 'vault' ? (
        <VaultView vaultId={session.vaultId} vaultName="Dragon's Vault" characters={characters}/>
      ) : (
        <CharacterSheetPage
          key={view.id}           /* remount on character switch = fresh data load */
          characterId={view.id}
          vaultId={session.vaultId}
        />
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
    </>
  );
}

export default App;