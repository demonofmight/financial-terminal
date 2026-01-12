import { createContext, useContext, ReactNode } from 'react';
import { useInitialLoad, DATA_SOURCE_IDS } from '../hooks/useInitialLoad';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  message: string;
  markLoaded: (sourceId: string) => void;
  completeLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const loadingState = useInitialLoad();

  return (
    <LoadingContext.Provider value={loadingState}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Re-export for convenience
export { DATA_SOURCE_IDS };
