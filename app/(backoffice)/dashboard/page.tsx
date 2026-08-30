"use client";

import { useMemo } from "react";
import { PageHead } from "@/components/page-head";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { useApiQuery } from "@/lib/use-api";
import type { ApiRoom, InvoiceDto, PropertyDto } from "@/lib/api-types";

const noProperties: PropertyDto[] = [];
const noInvoices: InvoiceDto[] = [];
const roomLabel: Record<string, string> = { VACANT: "ว่าง", OCCUPIED: "มีผู้เช่า", RESERVED: "จองแล้ว", MAINTENANCE: "ซ่อมบำรุง" };
const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { selectedBranch, selectedBranchId, loading: branchesLoading } = useBranch();
  const properties = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/properties` : null, noProperties);
  const invoices = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/invoices` : null, noInvoices);
  const rooms = useMemo(() => properties.data.flatMap((property) => property.buildings.flatMap((building) => building.rooms.map((room) => ({ ...room, building: building.name })))), [properties.data]);
  const stats = useMemo(() => {
    const occupied = rooms.filter((room) => room.status === "OCCUPIED").length;
    const issued = invoices.data.filter((invoice) => !["DRAFT", "VOID"].includes(invoice.status));
    const billed = issued.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    const received = issued.reduce((sum, invoice) => sum + (invoice.status === "PAID" ? Number(invoice.total) : 0), 0);
    return { occupied, billed, received, outstanding: Math.max(0, billed - received) };
  }, [invoices.data, rooms]);
  const loading = branchesLoading || properties.loading || invoices.loading;
  const error = properties.error || invoices.error;

  return <>
    <PageHead eyebrow="ข้อมูลจริงจากสาขาที่เลือก" title={selectedBranch ? `ภาพรวม${selectedBranch.name}` : "ภาพรวม"} subtitle={selectedBranch ? "สรุปสถานะห้องและยอดเรียกเก็บจากข้อมูลปัจจุบัน" : "สร้างสาขาและเพิ่มห้องก่อน ระบบจะแสดงข้อมูลที่นี่"} />
    <ApiNotice loading={loading} error={error} />
    {!loading && !selectedBranch && <section className="empty-state">ยังไม่มีสาขา ให้เริ่มจากเมนู “ร้านและสาขา”</section>}
    {selectedBranch && <><section className="summary-strip" aria-label="ตัวเลขสำคัญ"><div className="metric"><small>อัตราเข้าพัก</small><strong className="mono">{rooms.length ? `${((stats.occupied / rooms.length) * 100).toFixed(1)}%` : "—"}</strong><span>{stats.occupied} / {rooms.length} ห้อง</span></div><div className="metric"><small>ยอดเรียกเก็บ</small><strong className="mono">{money(stats.billed)}</strong><span>จากใบแจ้งหนี้ที่ออกแล้ว</span></div><div className="metric"><small>รับชำระแล้ว</small><strong className="mono">{money(stats.received)}</strong><span>ใบแจ้งหนี้ปิดยอดแล้ว</span></div><div className="metric"><small>ค้างชำระ</small><strong className="mono" style={{ color:"var(--coral)" }}>{money(stats.outstanding)}</strong><span>ยอดที่ยังไม่ปิด</span></div></section>
      <div className="ledger-layout"><section className="panel"><div className="panel-head"><div><h2>สถานะห้องพัก</h2><p>{rooms.length ? `${rooms.length} ห้องในสาขานี้` : "ยังไม่มีห้องพัก"}</p></div></div>{rooms.length ? <div className="building-grid">{rooms.map((room: ApiRoom & { building: string }) => <div className="room-cell" key={room.id}><i className="room-dot" /><span className="room-no">{room.number}</span><span className="room-name">{room.building} · {roomLabel[room.status] ?? room.status}</span></div>)}</div> : <p className="empty-state">เพิ่มห้องพักแล้วสถานะห้องจะแสดงตรงนี้</p>}</section>
      <aside className="panel"><div className="panel-head"><div><h2>ใบแจ้งหนี้ล่าสุด</h2><p>ของสาขาที่เลือก</p></div></div>{invoices.data.length ? <div className="due-list">{invoices.data.slice(0, 5).map((invoice) => <div className="due-item" key={invoice.id}><span className="room">{invoice.room.number}</span><div><strong>{invoice.contract.resident.fullName}</strong><small>{invoice.number} · {invoice.status}</small></div><b>{money(Number(invoice.total))}</b></div>)}</div> : <p className="empty-state">ยังไม่มีใบแจ้งหนี้</p>}</aside></div></>}
  </>;
}
