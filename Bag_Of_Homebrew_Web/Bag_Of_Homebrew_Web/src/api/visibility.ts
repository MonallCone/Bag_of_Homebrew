import { API_BASE } from '../config';

export async function setItemHiddenFromPlayers(characterId: string, itemId: string, hidden: boolean): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/characters/${characterId}/items/${itemId}/hide`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  return res.ok;
}

export async function setItemHiddenByGm(campaignId: string, memberUserId: string, itemId: string, hidden: boolean): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/members/${memberUserId}/items/${itemId}/hide`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  return res.ok;
}

export async function setVaultItemHiddenByGm(campaignId: string, itemId: string, hidden: boolean): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/vault/items/${itemId}/hide`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hidden }),
  });
  return res.ok;
}