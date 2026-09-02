"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { clearSession } from "@/lib/api";
import { useRouter } from "next/navigation";
import { InteractionFeedback } from "./interaction-feedback";
import { BranchProvider, useBranch } from "./branch-context";
import { useApiQuery } from "@/lib/use-api";
import { Select } from "./ui/select";

const groups = [
  { label:"ภาพรวม", items:[{href:"/dashboard",label:"แดชบอร์ด",icon:"dashboard"}] },
  { label:"จัดการหอพัก", items:[{href:"/stores",label:"ร้านและสาขา",icon:"building"},{href:"/rooms",label:"ห้องพัก",icon:"room"},{href:"/residents",label:"ผู้เช่า",icon:"people"}] },
  { label:"การเงิน", items:[{href:"/bills",label:"ใบแจ้งหนี้",icon:"bill"},{href:"/calendar",label:"ปฏิทินกำหนดชำระ",icon:"bill"},{href:"/payments",label:"ตรวจสอบการชำระ",icon:"payment"},{href:"/reports",label:"รายงาน CSV",icon:"bill"}] },
  { label:"ระบบ", items:[{href:"/users",label:"ผู้ใช้งาน",icon:"people"},{href:"/roles",label:"บทบาทและสิทธิ์",icon:"roles"},{href:"/settings",label:"ตั้งค่า PromptPay",icon:"settings"}] },
];
const platformGroup = { label:"Platform", items:[{href:"/platform/stores",label:"จัดการร้านค้า",icon:"building"}] };
export function AppShell({ children }: { children: React.ReactNode }) {
  return <BranchProvider><ShellContent>{children}</ShellContent></BranchProvider>;
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [navigating,setNavigating]=useState(false);
  const { branches, selectedBranchId, selectBranch, loading: branchesLoading } = useBranch();
  const me = useApiQuery<{ isPlatformAdmin:boolean }>("/auth/me", { isPlatformAdmin:false });
  useEffect(()=>setNavigating(false),[path]);
  const current = groups.flatMap(g=>g.items).find(i=>path.startsWith(i.href))?.label ?? "ภาพรวม";
  return <div className="app-shell"><InteractionFeedback />
    <aside className={`sidebar ${open?"open":""}`} aria-label="เมนูหลัก">
      <div className="brand"><div className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></div><div><strong>ห้องบัญชี</strong><small>Dormitory Ledger</small></div></div>
      <nav className="nav">{[...(me.data?.isPlatformAdmin ? [platformGroup] : []), ...groups].map(group=><div key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item=><Link key={item.href} href={item.href} className={path.startsWith(item.href)?"active":""} onClick={()=>{setOpen(false);if(!path.startsWith(item.href))setNavigating(true)}}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="avatar">สท</div><div><strong>สมชาย ทองดี</strong><button onClick={()=>{clearSession();router.replace("/login")}} style={{border:0,background:"none",padding:0,color:"#8290a9",fontSize:11,cursor:"pointer"}}>ออกจากระบบ</button></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setOpen(v=>!v)} aria-label="เปิดเมนู">☰</button><div className="crumb">ห้องบัญชี&nbsp; / &nbsp;<strong>{current}</strong></div><div className="top-actions"><Select className="branch-select" placeholder={branchesLoading ? "กำลังโหลดสาขา…" : "เลือกสาขา"} value={selectedBranchId ?? undefined} disabled={branchesLoading || !branches.length} onValueChange={(value)=>selectBranch(value || null)} options={branches.map((branch)=>({ value:branch.id, label:branch.name }))} /></div></header>
      <div className="content">{navigating ? <RouteSkeleton /> : children}</div>
    </main>
  </div>;
}

function RouteSkeleton() {
  return <section className="route-skeleton" aria-label="กำลังเปลี่ยนหน้า" role="status">
    <div className="skeleton-title" /><div className="skeleton-subtitle" />
    <div className="skeleton-metrics"><i /><i /><i /></div>
    <div className="skeleton-table"><b /><b /><b /><b /><b /></div>
  </section>;
}
