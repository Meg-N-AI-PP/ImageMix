import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

// A library-sourced image selected for use as a fusion input.
export interface SelectedSource {
  id: string;
  name: string;
  dataUrl: string;
  // libraryId is set when the source came from a saved library image.
  libraryId?: string;
}

interface SelectionContextValue {
  sources: SelectedSource[];
  add: (source: SelectedSource) => void;
  addMany: (sources: SelectedSource[]) => void;
  remove: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  clear: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SelectedSource[]>([]);

  const add = useCallback((source: SelectedSource) => {
    setSources((current) =>
      current.some((s) => s.id === source.id) ? current : [...current, source]
    );
  }, []);

  const addMany = useCallback((incoming: SelectedSource[]) => {
    setSources((current) => {
      const next = [...current];
      for (const source of incoming) {
        if (!next.some((s) => s.id === source.id)) {
          next.push(source);
        }
      }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSources((current) => current.filter((s) => s.id !== id));
  }, []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    setSources((current) => {
      const index = current.findIndex((s) => s.id === id);
      if (index === -1) {
        return current;
      }
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSources([]), []);

  const value = useMemo(
    () => ({ sources, add, addMany, remove, move, clear }),
    [sources, add, addMany, remove, move, clear]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection must be used within a SelectionProvider.');
  }
  return ctx;
}
