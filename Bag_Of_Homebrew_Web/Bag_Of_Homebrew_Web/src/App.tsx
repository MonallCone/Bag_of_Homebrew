import { useEffect, useState } from 'react';

const API_BASE = 'https://localhost:7238';

interface User {
  email: string;
  name: string;
}

function App() {
  const [user, setUser] = useState<User | null | 'loading'>('loading');

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  if (user === 'loading') return <p>Checking session...</p>;

  if (user) {
    return (
      <div>
        <p>Welcome, {user.name} ({user.email})</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  // Full page navigation, not fetch — Google's flow requires a real redirect
  return <a href={`${API_BASE}/api/auth/login`}>Login with Google</a>;
}

export default App;