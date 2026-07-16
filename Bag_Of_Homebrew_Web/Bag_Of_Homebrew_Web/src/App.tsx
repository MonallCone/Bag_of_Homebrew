import { useEffect, useState } from 'react';
import { CharacterSheetPage } from './Components/CharacterSheet/CharacterSheetPage';
import './App.css';

const API_BASE = 'https://localhost:7238';

interface User {
  displayName: string;
}

function App() {
  const [user, setUser] = useState<User | null | 'loading'>('loading');

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === 'loading') return <p>Checking session...</p>;

  if (!user) {
    return <a href={`${API_BASE}/api/auth/login`}>Login with Google</a>;
  }

  return <CharacterSheetPage characterName="Test Character" />;
}

export default App;