"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { BranchDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

type BranchContextValue = { branches: BranchDto[]; selectedBranchId: string | null; selectedBranch: BranchDto | null; selectBranch: (id: string | null) => void; loading: boolean };
const BranchContext = createContext<BranchContextValue | null>(null);
const emptyBranches: BranchDto[] = [];
const storageKey = "dormitory:selected-branch";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const query = useApiQuery("/branches", emptyBranches);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data.length) { setSelectedBranchId(null); return; }
    const saved = window.localStorage.getItem(storageKey);
    setSelectedBranchId((current) => query.data.some((branch) => branch.id === current) ? current : (query.data.some((branch) => branch.id === saved) ? saved : query.data[0].id));
  }, [query.data]);
  const selectBranch = (id: string | null) => { setSelectedBranchId(id); if (id) window.localStorage.setItem(storageKey, id); else window.localStorage.removeItem(storageKey); };
  const value = useMemo(() => ({ branches: query.data, selectedBranchId, selectedBranch: query.data.find((branch) => branch.id === selectedBranchId) ?? null, selectBranch, loading: query.loading }), [query.data, query.loading, selectedBranchId]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used inside BranchProvider");
  return context;
}
