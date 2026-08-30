"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BranchDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

type BranchContextValue = { branches: BranchDto[]; selectedBranchId: string | null; selectedBranch: BranchDto | null; selectBranch: (id: string | null) => void; removeBranch: (id: string) => void; loading: boolean };
const BranchContext = createContext<BranchContextValue | null>(null);
const emptyBranches: BranchDto[] = [];
const storageKey = "dormitory:selected-branch";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const query = useApiQuery("/branches", emptyBranches);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const branches = useMemo(() => query.data.filter((branch) => !removedIds.includes(branch.id)), [query.data, removedIds]);
  useEffect(() => {
    if (!branches.length) { setSelectedBranchId(null); return; }
    const saved = window.localStorage.getItem(storageKey);
    setSelectedBranchId((current) => branches.some((branch) => branch.id === current) ? current : (branches.some((branch) => branch.id === saved) ? saved : branches[0].id));
  }, [branches]);
  const selectBranch = useCallback((id: string | null) => { setSelectedBranchId(id); if (id) window.localStorage.setItem(storageKey, id); else window.localStorage.removeItem(storageKey); }, []);
  const removeBranch = useCallback((id: string) => { setRemovedIds((current) => current.includes(id) ? current : [...current, id]); if (selectedBranchId === id) selectBranch(null); }, [selectedBranchId, selectBranch]);
  const value = useMemo(() => ({ branches, selectedBranchId, selectedBranch: branches.find((branch) => branch.id === selectedBranchId) ?? null, selectBranch, removeBranch, loading: query.loading }), [branches, query.loading, removeBranch, selectBranch, selectedBranchId]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used inside BranchProvider");
  return context;
}
