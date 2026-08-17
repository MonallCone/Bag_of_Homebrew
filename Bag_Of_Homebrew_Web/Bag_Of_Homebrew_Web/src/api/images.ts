import { API_BASE } from '../config';

export async function uploadImage(file: File, kind: 'items' | 'portraits' | 'sheets'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/images/${kind}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new Error(message || 'Upload failed');
  }

  const data: { url: string } = await res.json();
  return data.url;
}

export async function fetchDefaultImages(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/images/defaults`, { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
}

// Stored URLs are relative (/uploads/...); prepend the API host for display
export function imageSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}