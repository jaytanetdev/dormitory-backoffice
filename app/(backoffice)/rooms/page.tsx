"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { Select } from "@/components/ui/select";
import { apiMutation } from "@/lib/api";
import type { ApiRoom, PropertyDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

type RoomType = { id: string; name: string; baseRent: number | string };
type Building = { id: string; name: string };
type Property = { id: string; name: string };
type DisplayRoom = ApiRoom & { building: string; buildingId: string };
type RoomInvite = { id: string; roomId: string; roomNumber: string; expiresAt: string; claimUrl: string };
const noProperties: PropertyDto[] = [];
const noTypes: RoomType[] = [];
const labels: Record<string, string> = { VACANT: "ห้องว่าง", OCCUPIED: "มีผู้เช่า", RESERVED: "จองแล้ว", MAINTENANCE: "ซ่อมบำรุง" };

export default function Rooms() {
  const { selectedBranchId: branchId, selectedBranch, loading: branchesLoading } = useBranch();
  const properties = useApiQuery(branchId ? `/branches/${branchId}/properties` : null, noProperties);
  const types = useApiQuery("/room-types", noTypes);
  const [items, setItems] = useState<DisplayRoom[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setItems(properties.data.flatMap((property) =>
      property.buildings.flatMap((building) =>
        building.rooms.map((room) => ({ ...room, building: building.name, buildingId: building.id })),
      ),
    ));
  }, [properties.data]);

  const visible = useMemo(() => items.filter((room) =>
    (!search || `${room.number} ${room.floor ?? ""} ${room.roomType.name} ${room.building}`.toLowerCase().includes(search.toLowerCase())) &&
    (!status || room.status === status),
  ), [items, search, status]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) return;
    setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const buildingName = String(form.get("buildingName")).trim();
    const typeName = String(form.get("typeName")).trim();
    const rent = Number(form.get("monthlyRent"));
    let building = properties.data.flatMap((property) => property.buildings).find((item) => item.name.toLowerCase() === buildingName.toLowerCase()) as Building | undefined;
    if (!building) {
      let property = properties.data[0] as Property | undefined;
      if (!property) {
        const result = await apiMutation<Property>("/properties", { branchId, name: selectedBranch?.name ?? "หอพัก", typeName: "หอพัก" });
        if (!result.ok) { setBusy(false); setError(result.message); return; }
        property = result.data;
      }
      const result = await apiMutation<Building>(`/properties/${property.id}/buildings`, { name: buildingName });
      if (!result.ok) { setBusy(false); setError(result.message); return; }
      building = result.data;
    }
    let roomType = types.data.find((item) => item.name.toLowerCase() === typeName.toLowerCase());
    if (!roomType) {
      const result = await apiMutation<RoomType>("/room-types", { name: typeName, baseRent: rent });
      if (!result.ok) { setBusy(false); setError(result.message); return; }
      roomType = result.data;
    }
    const result = await apiMutation<ApiRoom>(`/buildings/${building.id}/rooms`, { roomTypeId: roomType.id, number: String(form.get("number")), floor: String(form.get("floor")) || undefined, monthlyRent: rent });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => [...current, { ...result.data, roomType: { name: roomType.name, baseRent: rent }, building: building.name, buildingId: building.id }]);
    setOpen(false);
  }

  async function createInvite(room: DisplayRoom) {
    setInviteBusyId(room.id); setError(null); setCopied(false);
    const result = await apiMutation<RoomInvite>(`/rooms/${room.id}/invites`, { expiresInHours: 48 });
    setInviteBusyId(null);
    if (!result.ok) { setError(result.message); return; }
    setInvite(result.data);
  }

  async function copyInvite() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.claimUrl);
    setCopied(true);
  }

  return <>
    <PageHead title="ห้องพัก" subtitle={selectedBranch ? `จัดการห้องของ ${selectedBranch.name}` : "เลือกหรือสร้างสาขาก่อนเพิ่มห้อง"} />
    <div className="page-head-actions"><button className="button" onClick={() => setOpen(true)} disabled={!branchId}>＋ เพิ่มห้อง</button></div>
    <ApiNotice loading={branchesLoading || properties.loading || types.loading} error={properties.error || types.error || error} />

    {open && <div className="modal-backdrop"><section className="modal"><div className="modal-head"><div><div className="eyebrow">ห้องใหม่</div><h2>เพิ่มห้องพัก</h2></div><button className="icon-button" onClick={() => setOpen(false)} disabled={busy}>×</button></div><form onSubmit={create}><label className="field"><span>ชื่ออาคาร</span><input name="buildingName" placeholder="เช่น อาคาร A" required /></label><label className="field"><span>ประเภทห้อง</span><input name="typeName" placeholder="เช่น ห้องปูน ห้องไม้ บ้าน" required /></label><label className="field"><span>เลขห้อง</span><input name="number" placeholder="เช่น A101" required /></label><label className="field"><span>ชั้น</span><input name="floor" placeholder="เช่น 1" /></label><label className="field"><span>ค่าเช่าต่อเดือน</span><input name="monthlyRent" type="number" min="1" required /></label><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)} disabled={busy}>ยกเลิก</button><button className="button" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มห้อง"}</button></div></form></section></div>}

    {invite && <div className="modal-backdrop" onMouseDown={() => setInvite(null)}><section className="modal room-invite-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ลิงก์เชิญผู้เช่า</div><h2>ห้อง {invite.roomNumber}</h2></div><button type="button" className="icon-button" onClick={() => setInvite(null)}>×</button></div><div className="room-invite-success"><span>✓</span><strong>สร้างลิงก์เฉพาะห้องแล้ว</strong><p>ใช้ได้ถึง {new Date(invite.expiresAt).toLocaleString("th-TH")} และยืนยันได้ครั้งเดียว</p></div><div className="room-invite-link"><code>{invite.claimUrl}</code><button type="button" className="button" onClick={() => void copyInvite()}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button></div><p className="security-note">ส่งลิงก์นี้ให้ผู้เช่าห้อง {invite.roomNumber} เท่านั้น เมื่อยืนยันสำเร็จระบบจะสร้างผู้เช่าและสัญญาให้อัตโนมัติ</p></section></div>}

    <div className="toolbar"><input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเลขห้อง ชั้น ประเภท หรืออาคาร" /><Select className="filter" value={status} onValueChange={setStatus} options={[{ value: "", label: "ทุกสถานะ" }, { value: "VACANT", label: "ห้องว่าง" }, { value: "OCCUPIED", label: "มีผู้เช่า" }, { value: "RESERVED", label: "จองแล้ว" }, { value: "MAINTENANCE", label: "ซ่อมบำรุง" }]} /></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>ห้อง</th><th>ชั้น</th><th>ประเภท</th><th>อาคาร</th><th>สถานะ</th><th>ค่าเช่า</th><th>ลิงก์ผู้เช่า</th></tr></thead><tbody>{visible.map((room) => <tr key={room.id}><td><strong>{room.number}</strong></td><td>{room.floor || "—"}</td><td>{room.roomType.name}</td><td>{room.building}</td><td><Status>{labels[room.status]}</Status></td><td className="money">฿{Number(room.roomType.baseRent).toLocaleString("th-TH")}</td><td>{room.status === "VACANT" ? <button type="button" className="room-invite-button" disabled={inviteBusyId === room.id} onClick={() => void createInvite(room)}>{inviteBusyId === room.id ? "กำลังสร้าง…" : "สร้างลิงก์"}</button> : <span className="table-muted">—</span>}</td></tr>)}</tbody></table>{!visible.length && !properties.loading && <p className="empty-state">ไม่พบห้องพัก</p>}</div>
  </>;
}
