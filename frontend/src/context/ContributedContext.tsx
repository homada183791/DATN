import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { HomeworkProblem } from './HomeworkContext';

export interface ContributedProblem extends HomeworkProblem {
  author: string;
  authorRole: 'student' | 'instructor';
  category: string;
  createdAt: string;
}

interface ContributedContextType {
  contributed: ContributedProblem[];
  addContributed: (items: ContributedProblem[]) => void;
  removeContributed: (id: string) => void;
}

const ContributedContext = createContext<ContributedContextType | undefined>(undefined);
const LS_KEY = 'jh-contributed-v1';

export function ContributedProvider({ children }: { children: ReactNode }) {
  const [contributed, setContributed] = useState<ContributedProblem[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(contributed)); }, [contributed]);

  const addContributed = (items: ContributedProblem[]) => setContributed((c) => [...items, ...c]);
  const removeContributed = (id: string) => setContributed((c) => c.filter((p) => p.id !== id));

  return (
    <ContributedContext.Provider value={{ contributed, addContributed, removeContributed }}>
      {children}
    </ContributedContext.Provider>
  );
}

export function useContributed() {
  const ctx = useContext(ContributedContext);
  if (!ctx) throw new Error('useContributed must be used within ContributedProvider');
  return ctx;
}
