"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { apiMutation } from "@/lib/api";
import type { BranchDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const emptyBranches: BranchDto[] = [];
type BranchForm = { name:string; code:string; address:string; phone:string; lineName:string; channelId:string; liffId:string; channelAccessToken:string; channelSecret:string };
const initialForm: BranchForm = { name:"", code:"", address:"", phone:"", lineName:"", channelId:"", liffId:"", channelAccessToken:"", channelSecret:"" };
const claimUrl = (branch: BranchDto) => branch.claimUrl ?? branch.residentClaimUrl ?? (branch.claimCode ? `${process.env.NEXT_PUBLIC_MINIAPP_URL ?? "http://localhost:3102"}/claim/${branch.claimCode}` : null);
const codeFromName = (name: string) => name.trim().replace(/[^a-zA-Z0-9ก-๙]/g, "").slice(0, 12).toUpperCase();

function LineStatus({ branch }: { branch: BranchDto }) {
  const connected = Boolean(branch.lineIntegration?.id || branch.lineIntegration?.loginChannelId);
  return <span className={`line-status ${connected ? "connected" : "missing"}`}><i aria-hidden="true" />{connected ? "เชื่อม LINE แล้ว" : "ยังไม่ได้เชื่อม LINE"}</span>;
}

export default function StoresPage() {
  const query = useApiQuery("/branches", emptyBranches);
  const [items, setItems] = useState<BranchDto[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDto | null>(null);
  const [form, setForm] = useState<BranchForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setItems(query.data), [query.data]);
  const set = (key: keyof BranchForm, value: string) => setForm((old) => ({ ...old, [key]: value, ...(key === "name" && !editing && !old.code ? { code: codeFromName(value) } : {}) }));
  function openCreate() { setError(null); setEditing(null); setForm(initialForm); setOpen(true); }
  function openEdit(branch: BranchDto) {
    const line = branch.lineIntegration;
    setError(null); setEditing(branch);
    setForm({ name:branch.name, code:branch.code, address:branch.address ?? "", phone:branch.phone ?? "", lineName:line?.displayName ?? "", channelId:line?.loginChannelId ?? "", liffId:line?.liffId ?? "", channelAccessToken:"", channelSecret:"" }); setOpen(true);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null);
    const payload = { name:form.name.trim(), ...(editing ? {} : { code:form.code.trim().toUpperCase() }), address:form.address.trim() || undefined, phone:form.phone.trim() || undefined, lineDisplayName:form.lineName.trim(), lineLoginChannelId:form.channelId.trim(), lineLiffId:form.liffId.trim(), ...(form.channelAccessToken.trim() ? { lineChannelAccessToken:form.channelAccessToken.trim() } : {}), ...(form.channelSecret.trim() ? { lineChannelSecret:form.channelSecret.trim() } : {}) };
    const result = editing ? await apiMutation<BranchDto>(`/branches/${editing.id}`, payload, "PATCH") : await apiMutation<BranchDto>("/branches", payload);
    setBusy(false); if (!result.ok) { setError(result.message); return; }
    setItems((old) => editing ? old.map((item) => item.id === editing.id ? result.data : item) : [...old, result.data]); setOpen(false);
  }
  async function copyLink(branch: BranchDto) { const link = claimUrl(branch); if (!link) return; await navigator.clipboard.writeText(link); setCopied(branch.id); window.setTimeout(() => setCopied(null), 1800); }
  return <>
    <section className="branch-hero"><div><div className="eyebrow">โครงสร้างธุรกิจ</div><h1>สาขาและ LINE OA</h1><p className="subtitle">ทุกสาขามี LINE OA ของตัวเอง และสร้างลิงก์สำหรับให้ผู้เช่าผูกห้องได้จากที่เดียว</p></div><button type="button" className="button" onClick={openCreate}>＋ เพิ่มสาขา</button></section>
    <ApiNotice loading={query.loading} error={query.error || error} />
    {!query.loading && !items.length && <section className="branch-empty"><div className="branch-empty-icon">⌘</div><h2>เริ่มต้นด้วยการสร้างสาขา</h2><p>กรอกข้อมูล LINE OA ของสาขา แล้วระบบจะสร้างลิงก์ให้ผู้เช่าเข้ามาผูกห้องด้วยตัวเอง</p><button type="button" className="button" onClick={openCreate}>สร้างสาขาแรก</button></section>}
    <div className="branch-grid">{items.map((branch) => { const link = claimUrl(branch); return <article className="branch-card" key={branch.id}><header><div><div className="branch-code">{branch.code}</div><h2>{branch.name}</h2></div><LineStatus branch={branch} /></header><p className="branch-address">{branch.address || "ยังไม่ได้ระบุที่อยู่"}</p><div className="branch-meta"><span>Branch ID</span><code title={branch.id}>{branch.id}</code></div><div className="branch-divider" /><div className="branch-link-area"><div><strong>ลิงก์ผูกห้องสำหรับผู้เช่า</strong><small>ส่งลิงก์นี้ผ่าน LINE หรือ QR ของสาขา</small></div>{link ? <button type="button" className="link-copy" onClick={() => void copyLink(branch)}>{copied === branch.id ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button> : <span className="link-pending">กำลังรอสร้างจากระบบ</span>}</div>{link && <p className="claim-url" title={link}>{link}</p>}<footer><button type="button" className="button secondary" onClick={() => openEdit(branch)}>ตั้งค่าสาขา</button></footer></article>; })}</div>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={() => !busy && setOpen(false)}><section className="modal branch-modal" role="dialog" aria-modal="true" aria-labelledby="branch-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">{editing ? "แก้ไขการเชื่อมต่อ" : "ตั้งค่าสาขาใหม่"}</div><h2 id="branch-modal-title">{editing ? editing.name : "สาขาและ LINE OA"}</h2></div><button type="button" className="icon-button" aria-label="ปิด" disabled={busy} onClick={() => setOpen(false)}>×</button></div><form onSubmit={save}>
      <div className="form-section-title"><span>1</span><div><strong>ข้อมูลสาขา</strong><small>ใช้ระบุบริบทของห้อง สัญญา และใบแจ้งหนี้</small></div></div><div className="form-row"><label className="field"><span>ชื่อสาขา</span><input value={form.name} onChange={(event) => set("name", event.target.value)} required disabled={busy} placeholder="เช่น สาขารังสิต" /></label><label className="field"><span>รหัสสาขา</span><input value={form.code} onChange={(event) => set("code", event.target.value)} required disabled={busy} placeholder="RANGSIT" /></label></div><label className="field"><span>ที่อยู่</span><textarea value={form.address} onChange={(event) => set("address", event.target.value)} disabled={busy} placeholder="สำหรับแสดงในเอกสารและใบแจ้งหนี้" rows={2} /></label><label className="field"><span>เบอร์โทรสาขา</span><input value={form.phone} onChange={(event) => set("phone", event.target.value)} disabled={busy} inputMode="tel" placeholder="02-000-0000" /></label>
      <div className="form-section-title line-title"><span>2</span><div><strong>การเชื่อมต่อ LINE OA</strong><small>ข้อมูลนี้อยู่ฝั่งเซิร์ฟเวอร์และเข้ารหัสก่อนเก็บ</small></div></div><label className="field"><span>ชื่อสำหรับเรียก OA</span><input value={form.lineName} onChange={(event) => set("lineName", event.target.value)} required disabled={busy} placeholder="เช่น OA สาขารังสิต" /></label><div className="form-row"><label className="field"><span>LINE Channel ID</span><input value={form.channelId} onChange={(event) => set("channelId", event.target.value)} required disabled={busy} autoComplete="off" /></label><label className="field"><span>LIFF / Mini App ID</span><input value={form.liffId} onChange={(event) => set("liffId", event.target.value)} required disabled={busy} autoComplete="off" /></label></div><label className="field"><span>Channel access token {editing && <em>(เว้นว่างหากไม่เปลี่ยน)</em>}</span><input type="password" value={form.channelAccessToken} onChange={(event) => set("channelAccessToken", event.target.value)} required={!editing} disabled={busy} autoComplete="new-password" /></label><label className="field"><span>Channel secret {editing && <em>(เว้นว่างหากไม่เปลี่ยน)</em>}</span><input type="password" value={form.channelSecret} onChange={(event) => set("channelSecret", event.target.value)} required={!editing} disabled={busy} autoComplete="new-password" /></label><p className="security-note">ข้อมูลลับจะไม่แสดงกลับในหน้าเว็บ หลังบันทึกแล้วให้ใช้ลิงก์ผูกห้องจากการ์ดสาขาเพื่อเชิญผู้เช่า</p><div className="modal-actions"><button type="button" className="button ghost" disabled={busy} onClick={() => setOpen(false)}>ยกเลิก</button><button type="submit" className="button" disabled={busy}>{busy ? "กำลังบันทึก…" : editing ? "บันทึกการตั้งค่า" : "สร้างสาขาและลิงก์"}</button></div>
    </form></section></div>}
  </>;
}
