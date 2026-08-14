import type { Item } from '../Types/model';

export interface ApiItem extends Omit<Item, 'properties'> {
  propertiesJson: string;
}

export function toItem(raw: ApiItem): Item {
  let properties: Record<string, unknown> = {};
  try {
    properties = JSON.parse(raw.propertiesJson);
  } catch {
    // leave empty if malformed
  }
  return { ...raw, properties };
}