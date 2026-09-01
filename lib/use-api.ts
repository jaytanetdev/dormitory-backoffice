"use client";
import { useQuery } from "@tanstack/react-query";import { apiGet } from "./api";
export type QueryState<T>={loading:true;data:T;error:null}|{loading:false;data:T;error:string|null};
export function useApiQuery<T>(path:string|null,fallback:T):QueryState<T>{const query=useQuery({queryKey:["api",path],enabled:Boolean(path),queryFn:async()=>{const result=await apiGet<T>(path!,fallback);if(!result.ok)throw new Error(result.message);return result.data;}});const data=query.data ?? fallback;return query.isPending?{loading:true,data,error:null}:{loading:false,data,error:query.error instanceof Error?query.error.message:null};}
