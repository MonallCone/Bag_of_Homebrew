import { useEffect, useState } from 'react';
import { CharacterSheetPage } from './Components/CharacterSheet/CharacterSheetPage';
import './App.css';

const API_BASE = 'https://localhost:7238';

interface Session {
  displayName: string;
  characterId: string;
  characterName: string;
}

function App() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  if (session === 'loading') return <p>Checking session...</p>;

  if (!session) {
    return <a href={`${API_BASE}/api/auth/login`}>Login with Google</a>;
  }

  return (
    <CharacterSheetPage
      characterId={session.characterId}
      characterName={session.characterName}
    />
  );
}

export default App;