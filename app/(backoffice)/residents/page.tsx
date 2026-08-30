"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { Status } from "@/components/status";
import type { BranchDto, ResidentDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const noBranches: BranchDto[] = [];
const noResidents: ResidentDto[] = [];

export default function ResidentsPage() {
  const branches = useApiQuery("/branches", noBranches);
  const [branchId, setBranchId] = useState("");
  const residents = useApiQuery(branchId ? `/branches/${branchId}/residents` : null, noResidents);
  const [items, setItems] = useState<ResidentDto[]>([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const branch = branches.data.find((item) => item.id === branchId);
  useEffect(() => { if (!branchId && branches.data[0]) setBranchId(branches.data[0].id); }, [branchId, branches.data]);
  useEffect(() => setItems(residents.data), [residents.data]);
  const visible = useMemo(() => items.filter((resident) => `${resident.fullName} ${resident.phone ?? ""} ${resident.contracts[0]?.room.number ?? ""}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const link = branch?.claimUrl ?? branch?.residentClaimUrl ?? (branch?.claimCode ? `${process.env.NEXT_PUBLIC_MINIAPP_URL ?? "http://localhost:3102"}/join/${branch.claimCode}` : null);
  async function copyLink() { if (!link) return; await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  return <>
    <section className="resident-hero"><div><div className="eyebrow">ผู้เช่าและการยืนยันตัวตน</div><h1>เชิญผู้เช่าเข้าห้อง</h1><p className="subtitle">ผู้เช่าลงทะเบียนเองจากลิงก์ของสาขา ระบุเลขห้อง แล้วเชื่อมบัญชี LINE ในขั้นตอนเดียว</p></div></section>
    <ApiNotice loading={branches.loading || residents.loading} error={branches.error || residents.error} />
    <section className="invite-flow-card"><div className="invite-flow-head"><div><span className="flow-chip">ขั้นตอน 1</span><h2>เลือกลิงก์ของสาขา</h2><p>ลิงก์นี้ระบุสาขาให้อัตโนมัติ ผู้เช่าเพียงกรอกเลขห้องและเข้าสู่ระบบ LINE</p></div><select className="filter" aria-label="เลือกสาขา" value={branchId} onChange={(event) => setBranchId(event.target.value)}>{branches.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="invite-flow-body"><div className="invite-step"><b>1</b><span>ส่งลิงก์หรือ QR ของสาขาให้ผู้เช่า</span></div><div className="invite-step"><b>2</b><span>ผู้เช่าระบุเลขห้องและยืนยันตัวตนผ่าน LINE</span></div><div className="invite-step"><b>3</b><span>ระบบสร้างข้อมูลผู้เช่าและผูกกับห้องโดยอัตโนมัติ</span></div></div><div className="invite-link-row">{link ? <><code>{link}</code><button className="button" type="button" onClick={() => void copyLink()}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button></> : <span className="link-pending">สาขานี้ยังไม่มีลิงก์ โปรดตั้งค่า LINE OA ที่หน้าสาขา</span>}</div></section>
    <div className="resident-list-head"><div><h2>ผู้เช่าที่ลงทะเบียนแล้ว</h2><p>รายการนี้เกิดขึ้นหลังผู้เช่ายืนยัน LINE และเลขห้องสำเร็จ</p></div><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขห้อง" aria-label="ค้นหาผู้เช่า" /></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>ผู้เช่า</th><th>ห้อง</th><th>เบอร์โทร</th><th>สถานะสัญญา</th><th>LINE OA</th></tr></thead><tbody>{visible.map((resident) => <tr key={resident.id}><td><strong>{resident.fullName}</strong></td><td className="mono">{resident.contracts[0]?.room.number ?? "—"}</td><td className="mono">{resident.phone ?? "—"}</td><td>{resident.contracts.length ? "กำลังเช่า" : "รอผูกห้อง"}</td><td><Status>{resident.lineIdentity ? "เชื่อมแล้ว" : "รอเชื่อม"}</Status></td></tr>)}</tbody></table>{!visible.length && !residents.loading && <p className="empty-state">ยังไม่มีผู้เช่าที่ลงทะเบียนผ่านลิงก์ของสาขานี้</p>}</div>
  </>;
}
