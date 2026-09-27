"use client";
import { useApiQuery } from "./use-api";
export function usePermission(permission: string): boolean {
  const me = useApiQuery<{ permissions: string[] }>("/auth/me", {
    permissions: [],
  });
  return me.data.permissions.includes(permission);
}
