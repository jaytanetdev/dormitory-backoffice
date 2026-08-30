"use client";
import { useEffect, useState } from "react";import { usePathname, useRouter } from "next/navigation";import { hasSession } from "@/lib/api";
export function AuthGuard({children}:{children:React.ReactNode}){const router=useRouter();const path=usePathname();const [ready,setReady]=useState(false);useEffect(()=>{if(!hasSession()){router.replace(`/login?next=${encodeURIComponent(path)}`);return}setReady(true)},[path,router]);if(!ready)return <main className="auth-loading" role="status">กำลังตรวจสอบเซสชัน…</main>;return children}
