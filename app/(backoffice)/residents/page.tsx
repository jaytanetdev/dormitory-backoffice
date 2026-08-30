"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { Status } from "@/components/status";
import { apiMutation } from "@/lib/api";
import type { BranchDto, ResidentDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const noBranches: BranchDto[] = [];
const noResidents: ResidentDto[] = [];
const today = () => new Date().toISOString().slice(0, 10);
type MoveOutTarget = { residentId: string; residentName: string; contractId: string; roomNumber: string };

export default function ResidentsPage() {
  const branches = useApiQuery("/branches", noBranches);
  const [branchId, setBranchId] = useState("");
  const residents = useApiQuery(branchId ? `/branches/${branchId}/residents` : null, noResidents);
  const [items, setItems] = useState<ResidentDto[]>([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [moveOut, setMoveOut] = useState<MoveOutTarget | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branch = branches.data.find((item) => item.id === branchId);

  useEffect(() => { if (!branchId && branches.data[0]) setBranchId(branches.data[0].id); }, [branchId, branches.data]);
  useEffect(() => setItems(residents.data), [residents.data]);
  const visible = useMemo(() => items.filter((resident) => `${resident.fullName} ${resident.phone ?? ""} ${resident.contracts[0]?.room.number ?? ""}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const link = branch?.claimUrl ?? branch?.residentClaimUrl ?? null;

  async function copyLink() { if (!link) return; await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  async function confirmMoveOut() {
    if (!moveOut) return;
    setBusy(true); setError(null);
    const result = await apiMutation(`/contracts/${moveOut.contractId}/status`, { status: "ENDED", endDate: moveOutDate }, "PATCH");
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => current.map((resident) => resident.id === moveOut.residentId ? { ...resident, contracts: resident.contracts.map((contract) => contract.id === moveOut.contractId ? { ...contract, status: "ENDED", endDate: moveOutDate } : contract) } : resident));
    setMoveOut(null);
  }

  return <>
    <section className="resident-hero"><div><div className="eyebrow">ผู้เช่าและสัญญาเช่า</div><h1>จัดการผู้เช่าเข้า–ออก</h1><p className="subtitle">เชื่อมผู้เช่ากับห้องผ่าน LINE และปิดสัญญาเมื่อย้ายออกโดยยังเก็บประวัติบิลเดิม</p></div></section>
    <ApiNotice loading={branches.loading || residents.loading} error={branches.error || residents.error || error} />
    <section className="invite-flow-card"><div className="invite-flow-head"><div><span className="flow-chip">รับผู้เช่าใหม่</span><h2>ลิงก์ลงทะเบียนของสาขา</h2><p>สำหรับลิงก์ระบุห้องโดยตรง ให้สร้างจากปุ่ม “เชิญผู้เช่า” ในหน้าห้องพัก</p></div><select className="filter" aria-label="เลือกสาขา" value={branchId} onChange={(event) => setBranchId(event.target.value)}>{branches.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="invite-flow-body"><div className="invite-step"><b>1</b><span>สร้างลิงก์จากห้องที่ว่าง</span></div><div className="invite-step"><b>2</b><span>ผู้เช่ายืนยันตัวตนผ่าน LINE</span></div><div className="invite-step"><b>3</b><span>ระบบสร้างผู้เช่าและสัญญาอัตโนมัติ</span></div></div>
      <div className="invite-link-row">{link ? <><code>{link}</code><button className="button" type="button" onClick={() => void copyLink()}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์สาขา"}</button></> : <span className="link-pending">สาขานี้ยังไม่ได้ตั้งค่า LINE Mini App</span>}</div>
    </section>
    <div className="resident-list-head"><div><h2>รายชื่อผู้เช่า</h2><p>ผู้ที่ย้ายออกยังอยู่ในรายการเพื่อดูประวัติย้อนหลัง</p></div><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขห้อง" aria-label="ค้นหาผู้เช่า" /></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>ผู้เช่า</th><th>ห้องล่าสุด</th><th>เบอร์โทร</th><th>สถานะสัญญา</th><th>LINE OA</th><th>ดำเนินการ</th></tr></thead><tbody>{visible.map((resident) => {
      const contract = resident.contracts[0]; const active = contract?.status === "ACTIVE";
      return <tr key={resident.id}><td><strong>{resident.fullName}</strong></td><td className="mono">{contract?.room.number ?? "—"}</td><td className="mono">{resident.phone ?? "—"}</td><td><Status>{active ? "กำลังเช่า" : contract?.status === "ENDED" ? "ย้ายออกแล้ว" : "ไม่มีสัญญาใช้งาน"}</Status>{contract?.endDate && <small className="contract-end-date">สิ้นสุด {new Date(contract.endDate).toLocaleDateString("th-TH")}</small>}</td><td><Status>{resident.lineIdentity ? "เชื่อมแล้ว" : "รอเชื่อม"}</Status></td><td>{active ? <button className="room-invite-button move-out-button" onClick={() => { setMoveOut({ residentId: resident.id, residentName: resident.fullName, contractId: contract.id, roomNumber: contract.room.number }); setMoveOutDate(today()); }}>ย้ายออก</button> : <span className="table-muted">—</span>}</td></tr>;
    })}</tbody></table>{!visible.length && !residents.loading && <p className="empty-state">ยังไม่มีผู้เช่าในสาขานี้</p>}</div>
    {moveOut && <div className="modal-backdrop"><section className="modal"><div className="modal-head"><div><p className="eyebrow">ปิดสัญญาเช่า</p><h2>ยืนยันผู้เช่าย้ายออก</h2></div><button className="icon-button" onClick={() => setMoveOut(null)}>×</button></div>
      <div className="move-out-summary"><span>ผู้เช่า</span><strong>{moveOut.residentName}</strong><span>ห้อง</span><strong>{moveOut.roomNumber}</strong></div>
      <label className="field"><span>วันที่ย้ายออก</span><input type="date" value={moveOutDate} onChange={(event) => setMoveOutDate(event.target.value)} required /></label>
      <div className="move-out-warning"><strong>ก่อนปิดสัญญา</strong><p>ควรสร้างบิลรอบสุดท้ายและกรอกเลขมิเตอร์น้ำ–ไฟครั้งล่าสุดให้เรียบร้อย เมื่อยืนยันแล้วห้องจะเปลี่ยนเป็น “ว่าง” ทันที</p><Link href="/bills">ไปหน้าออกบิลรอบสุดท้าย</Link></div>
      <div className="modal-actions"><button className="button ghost" onClick={() => setMoveOut(null)}>ยกเลิก</button><button className="button danger" disabled={busy || !moveOutDate} onClick={() => void confirmMoveOut()}>{busy ? "กำลังปิดสัญญา…" : "ยืนยันย้ายออก"}</button></div>
    </section></div>}
  </>;
}
