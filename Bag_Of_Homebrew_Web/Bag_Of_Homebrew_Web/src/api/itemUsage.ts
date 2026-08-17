import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../config';

export interface ItemUsage {
  count: number;
  limit: number | null;   // null = unlimited (paid)
  isPaid: boolean;
}

export function useItemUsage() {
  const [usage, setUsage] = useState<ItemUsage | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/me/item-usage`, { credentials: 'include' });
    if (res.ok) setUsage(await res.json());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { usage, refreshUsage: refresh };
}