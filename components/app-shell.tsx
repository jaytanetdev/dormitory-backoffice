"use client";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./icons";
import { apiGet, clearSession } from "@/lib/api";
import { useRouter } from "next/navigation";
import { InteractionFeedback } from "./interaction-feedback";
import { BranchProvider, useBranch } from "./branch-context";
import { useApiQuery } from "@/lib/use-api";
import { Select } from "./ui/select";
import { lineQuotaMonthLabel } from "@/lib/line-quota";

const groups = [
  { label:"บิลและการเงิน", items:[{href:"/dashboard",label:"ภาพรวม",icon:"dashboard"},{href:"/bills",label:"ใบแจ้งหนี้",icon:"bill"},{href:"/payments",label:"ตรวจสลิป",icon:"payment"},{href:"/calendar",label:"ปฏิทินชำระเงิน",icon:"calendar"},{href:"/reports",label:"รายงานการเงิน",icon:"chart"}] },
  { label:"ห้องและผู้เช่า", items:[{href:"/rooms",label:"ห้องพัก",icon:"room"},{href:"/residents",label:"ผู้เช่า",icon:"people"},{href:"/chat",label:"แชทลูกบ้าน",icon:"chat"}] },
  { label:"ตั้งค่าและทีมงาน", items:[{href:"/stores",label:"ร้านและสาขา",icon:"building"},{href:"/users",label:"สมาชิกทีม",icon:"people"},{href:"/roles",label:"บทบาทและสิทธิ์",icon:"roles"},{href:"/settings",label:"ตั้งค่า PromptPay",icon:"settings"}] },
];
const platformGroup = { label:"Platform", items:[{href:"/platform/stores",label:"จัดการร้านค้า",icon:"building"}] };
export function AppShell({ children }: { children: React.ReactNode }) {
  return <BranchProvider><ShellContent>{children}</ShellContent></BranchProvider>;
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [navigating,setNavigating]=useState(false);
  const { branches, selectedBranchId, selectBranch, loading: branchesLoading } = useBranch();
  const me = useApiQuery<{ isPlatformAdmin:boolean;displayName?:string;roleName?:string;permissions:string[] }>("/auth/me", { isPlatformAdmin:false,permissions:[] });
  const lineQuota = useQuery({
    queryKey: ["api", "line-quota-sidebar", selectedBranchId],
    enabled: Boolean(selectedBranchId) && me.data.permissions.includes("notification.send"),
    queryFn: async () => {
      const result = await apiGet<{ configured: boolean; usage: number | null; quota: number | null; remaining: number | null }>(`/line/quota?branchId=${selectedBranchId}`, { configured: false, usage: null, quota: null, remaining: null });
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    const refreshQuota = (event: Event) => {
      const branchId = (event as CustomEvent<{ branchId?: string }>).detail?.branchId;
      const targetBranchId = branchId ?? selectedBranchId;
      if (targetBranchId) void queryClient.invalidateQueries({ queryKey: ["api", "line-quota-sidebar", targetBranchId] });
    };
    window.addEventListener("line-quota-updated", refreshQuota);
    return () => window.removeEventListener("line-quota-updated", refreshQuota);
  }, [queryClient, selectedBranchId]);
  useEffect(()=>setNavigating(false),[path]);
  const menuPermissions:Record<string,string[]>={"/dashboard":["invoice.view","property.view"],"/stores":["branch.view"],"/rooms":["property.view","room.view"],"/residents":["resident.view"],"/bills":["invoice.view"],"/calendar":["invoice.view"],"/payments":["payment.view"],"/reports":["report.view"],"/chat":["notification.send"],"/users":["user.view"],"/roles":["role.view"],"/settings":["settings.view"]};
  const visibleGroups=groups.map(group=>({...group,items:group.items.filter(item=>(item.href !== "/roles" || me.data.isPlatformAdmin) && (menuPermissions[item.href] ?? []).every(permission=>me.data.permissions.includes(permission)))})).filter(group=>group.items.length);
  const current = groups.flatMap(g=>g.items).find(i=>path.startsWith(i.href))?.label ?? "ภาพรวม";
  return <div className="app-shell"><InteractionFeedback />
    <aside className={`sidebar ${open?"open":""}`} id="backoffice-navigation" aria-label="เมนูหลัก" onKeyDown={event=>{if(event.key==="Escape")setOpen(false)}}>
      <div className="brand"><div className="brand-mark" aria-hidden="true"><i/><i/><i/><i/></div><div><strong>ห้องบัญชี</strong><small>Dormitory Ledger</small></div></div>
      <button className="sidebar-close" aria-label="ปิดเมนู" onClick={()=>setOpen(false)}>×</button>
      <nav className="nav">{[...(me.data?.isPlatformAdmin ? [platformGroup] : []), ...visibleGroups].map(group=><div key={group.label}><div className="nav-label">{group.label}</div>{group.items.filter(item=>item.href !== "/roles" || me.data?.isPlatformAdmin).map(item=><Link key={item.href} href={item.href} className={path.startsWith(item.href)?"active":""} aria-current={path.startsWith(item.href)?"page":undefined} onClick={()=>{setOpen(false);if(!path.startsWith(item.href))setNavigating(true)}}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-foot"><div className="avatar">{me.data.displayName?.slice(0,2) ?? "ทีม"}</div><div><strong>{me.data.displayName ?? "สมาชิกทีม"}</strong><small>{me.data.roleName}</small><button className="sidebar-signout" onClick={()=>{clearSession();router.replace("/login")}}>ออกจากระบบ</button></div></div>
      {me.data.permissions.includes("notification.send") && lineQuota.data?.configured && <LineQuotaSidebar quota={lineQuota.data} loading={lineQuota.isPending} />}
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setOpen(v=>!v)} aria-label="เปิดเมนู" aria-expanded={open} aria-controls="backoffice-navigation">☰</button><div className="crumb">ห้องบัญชี&nbsp; / &nbsp;<strong>{current}</strong></div><div className="top-actions"><ThemeToggle /><Select className="branch-select" placeholder={branchesLoading ? "กำลังโหลดสาขา…" : "เลือกสาขา"} value={selectedBranchId ?? undefined} disabled={branchesLoading || !branches.length} onValueChange={(value)=>selectBranch(value || null)} options={branches.map((branch)=>({ value:branch.id, label:branch.name }))} /></div></header>
      <div className="content">{navigating ? <RouteSkeleton /> : children}</div>
    </main>
  </div>;
}

function LineQuotaSidebar({ quota, loading }: { quota?: { configured: boolean; usage: number | null; quota: number | null; remaining: number | null }; loading: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const limit = quota?.quota ?? 0;
  const used = quota?.usage ?? 0;
  const known = quota?.quota != null && quota?.usage != null && quota?.remaining != null;
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0;
  return <section className="sidebar-quota" aria-label="โควตาแจ้งเตือน LINE">
    <div className="sidebar-quota-head"><span>โควตา LINE เดือนนี้</span><span className="sidebar-quota-badge">รายเดือน</span></div>
    <div className="sidebar-quota-remaining"><b>{loading ? "…" : quota?.remaining == null ? "—" : quota.remaining.toLocaleString("th-TH")}</b><span>ข้อความคงเหลือ</span></div>
    {known && <><div className="sidebar-quota-track" role="progressbar" aria-label="โควตา LINE ที่ใช้แล้ว" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: percent + "%" }} /></div>
    <div className="sidebar-quota-foot"><span>ใช้ {used.toLocaleString("th-TH")} / {limit.toLocaleString("th-TH")}</span><span>{Math.round(percent)}%</span></div></>}
    <div className="sidebar-quota-reset"><Icon name="calendar"/><div><span>เริ่มรอบเดือนถัดไป</span><strong>{now ? lineQuotaMonthLabel(now) : "กำลังโหลด…"}</strong><small>โควตารายเดือนตาม LINE</small></div></div>
  </section>;
}

function RouteSkeleton() {
  return <section className="route-skeleton" aria-label="กำลังเปลี่ยนหน้า" role="status">
    <div className="skeleton-title" /><div className="skeleton-subtitle" />
    <div className="skeleton-metrics"><i /><i /><i /></div>
    <div className="skeleton-table"><b /><b /><b /><b /><b /></div>
  </section>;
}
