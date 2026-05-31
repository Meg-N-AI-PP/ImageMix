import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { SavedImage } from '../../shared/types';
import { imageApi } from '../services/imageApi';

export type LibraryItem = SavedImage & { dataUrl: string };

interface LibraryContextValue {
  items: LibraryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (item: LibraryItem) => void;
  removeItem: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await imageApi.listLibrary();
      setItems(result.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback((item: LibraryItem) => {
    setItems((current) => [item, ...current.filter((i) => i.id !== item.id)]);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const result = await imageApi.deleteImage(id);
    if (result.success) {
      setItems((current) => current.filter((item) => item.id !== id));
    } else {
      throw new Error(result.error ?? 'Failed to delete image.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ items, loading, error, refresh, addItem, removeItem }),
    [items, loading, error, refresh, addItem, removeItem]
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useImageLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useImageLibrary must be used within a LibraryProvider.');
  }
  return ctx;
}
