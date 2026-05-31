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
  // Percentage (0..100) of how much this image contributes to the fusion.
  weightPercent: number;
}

// Input shape for adding a source. weightPercent is assigned by the provider
// when omitted, so callers do not need to compute it.
export type SelectedSourceInput = Omit<SelectedSource, 'weightPercent'> & {
  weightPercent?: number;
};

interface SelectionContextValue {
  sources: SelectedSource[];
  add: (source: SelectedSourceInput) => void;
  addMany: (sources: SelectedSourceInput[]) => void;
  remove: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  updateWeight: (id: string, weightPercent: number) => void;
  clear: () => void;
}

// Evenly distributes 100% across all sources that do not already have a weight,
// keeping the total at 100 and giving any remainder to the first sources.
function distributeWeights(
  sources: SelectedSourceInput[]
): SelectedSource[] {
  if (!sources.length) {
    return [];
  }
  const base = Math.floor(100 / sources.length);
  let remainder = 100 - base * sources.length;
  return sources.map((source) => ({
    ...source,
    weightPercent: base + (remainder-- > 0 ? 1 : 0)
  }));
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<SelectedSource[]>([]);

  const add = useCallback((source: SelectedSourceInput) => {
    setSources((current) =>
      current.some((s) => s.id === source.id)
        ? current
        : distributeWeights([...current, source])
    );
  }, []);

  const addMany = useCallback((incoming: SelectedSourceInput[]) => {
    setSources((current) => {
      const next: SelectedSourceInput[] = [...current];
      for (const source of incoming) {
        if (!next.some((s) => s.id === source.id)) {
          next.push(source);
        }
      }
      return distributeWeights(next);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSources((current) =>
      distributeWeights(current.filter((s) => s.id !== id))
    );
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

  const updateWeight = useCallback((id: string, weightPercent: number) => {
    const nextWeight = Math.max(0, Math.min(100, Math.round(weightPercent)));
    setSources((current) =>
      current.map((source) =>
        source.id === id ? { ...source, weightPercent: nextWeight } : source
      )
    );
  }, []);

  const clear = useCallback(() => setSources([]), []);

  const value = useMemo(
    () => ({ sources, add, addMany, remove, move, updateWeight, clear }),
    [sources, add, addMany, remove, move, updateWeight, clear]
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
