export const ESTIMATE_SCHEMA_VERSION = 1 as const;

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  unit: string;
  /** Monetary value stored in kopecks. */
  price: number;
  type?: 'work' | 'material';
  description?: string;
  code?: string;
}

export interface ProfileMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  manifestUrl: string;
  categories: string[];
  itemCount?: number;
  version?: string;
}

export interface ProfileCatalog {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: string[];
  items: CatalogItem[];
  synonyms?: string[][];
}

export interface EstimateItem {
  id: string;
  catalogId?: string;
  name: string;
  category: string;
  categoryId: string;
  unit: string;
  /** Unit price stored in kopecks. */
  price: number;
  quantity: number;
  /** Line total stored in kopecks. */
  total: number;
  description?: string;
  type?: 'work' | 'material';
}

export interface Estimate {
  schemaVersion: typeof ESTIMATE_SCHEMA_VERSION;
  id: string;
  title: string;
  customer: string;
  companyName: string;
  date: string;
  phone?: string;
  address?: string;
  notes?: string;
  profileId: string;
  profileName?: string;
  items: EstimateItem[];
  discount: number;
  /** All monetary totals are stored in kopecks and are derived from items. */
  subtotal: number;
  servicesSubtotal: number;
  materialsSubtotal: number;
  total: number;
  createdAt: number;
  updatedAt: number;
}
