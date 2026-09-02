"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiNotice } from "@/components/api-notice";
import { PageHead } from "@/components/page-head";
import { apiMutation } from "@/lib/api";
import { useApiQuery } from "@/lib/use-api";
import type { PlatformStoreDto } from "@/lib/api-types";

type FormValues = { name:string; slug:string; branchName:string; branchCode:string; ownerName:string; ownerEmail:string; ownerPassword:string };
const empty: PlatformStoreDto[] = [];

export default function PlatformStoresPage() {
  const stores = useApiQuery<PlatformStoreDto[]>("/platform/stores", empty);
  const [items, setItems] = useState<PlatformStoreDto[]>([]);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string|null>(null); const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { slug:"", branchCode:"MAIN" } });
  useEffect(() => setItems(stores.data), [stores.data]);
  async function create(values: FormValues) { setBusy(true); setError(null); const result = await apiMutation<{store:PlatformStoreDto}>("/platform/stores", values); setBusy(false); if (!result.ok) { setError(result.message); return; } setItems((current) => [result.data.store, ...current]); setDone(true); reset(); window.setTimeout(() => { setDone(false); setOpen(false); }, 700); }
  return <><PageHead eyebrow="Platform control" title="จัดการร้านค้า" subtitle="สร้างและดูแลร้านค้าทั้งหมดในระบบ เฉพาะ Super Admin เท่านั้น" /><div className="page-head-actions"><button className="button" type="button" onClick={() => { setOpen(true); setDone(false); }}>สร้างร้านค้า</button></div><ApiNotice loading={stores.loading} error={stores.error || error} />
    <section className="platform-store-grid">{items.map((store) => <article className="platform-store-card" key={store.id}><div className="platform-store-mark">{store.name.slice(0,1)}</div><div className="platform-store-card-head"><div><h2>{store.name}</h2><code>{store.slug}</code></div><span>{store._count.branches} สาขา</span></div><div className="platform-store-meta"><span>{store._count.users} ผู้ใช้</span><span>{store._count.invoices} ใบแจ้งหนี้</span></div><div className="platform-branch-list">{store.branches.map((branch) => <span key={branch.id}>{branch.name} · {branch.code}</span>)}</div></article>)}{!items.length && !stores.loading && <div className="empty-state">ยังไม่มีร้านค้าในระบบ</div>}</section>
    {open && <div className="modal-backdrop" onMouseDown={() => !busy && setOpen(false)}><section className="modal platform-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">สร้างร้านค้าใหม่</div><h2>เริ่มต้นร้านและสาขาหลัก</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} disabled={busy}>×</button></div>{done ? <div className="success-state">สร้างร้านค้าเรียบร้อยแล้ว</div> : <form onSubmit={handleSubmit(create)}><div className="form-grid-two"><label className="field"><span>ชื่อร้าน</span><input {...register("name", { required:true })} disabled={busy} />{errors.name && <small className="field-error">กรุณากรอกชื่อร้าน</small>}</label><label className="field"><span>รหัสร้านสำหรับ Login</span><input {...register("slug", { required:true, pattern:/^[a-z0-9-]{3,50}$/ })} placeholder="baan-sukhumvit" disabled={busy} />{errors.slug && <small className="field-error">ใช้ a-z, 0-9 และ - ความยาว 3-50 ตัว</small>}</label><label className="field"><span>ชื่อสาขาหลัก</span><input {...register("branchName", { required:true })} disabled={busy} /></label><label className="field"><span>รหัสสาขา</span><input {...register("branchCode", { required:true })} disabled={busy} /></label></div><div className="settings-divider"><span className="eyebrow">เจ้าของร้าน</span><p>ระบบจะสร้างบัญชี Store Admin ให้พร้อมใช้งาน</p></div><div className="form-grid-two"><label className="field"><span>ชื่อผู้ดูแลร้าน</span><input {...register("ownerName", { required:true })} disabled={busy} /></label><label className="field"><span>อีเมล</span><input type="email" {...register("ownerEmail", { required:true })} disabled={busy} /></label><label className="field"><span>รหัสผ่านเริ่มต้น</span><input type="password" minLength={12} {...register("ownerPassword", { required:true, minLength:12 })} disabled={busy} /><small className="help">อย่างน้อย 12 ตัวอักษร</small></label></div><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)} disabled={busy}>ยกเลิก</button><button className="button" disabled={busy}>{busy ? "กำลังสร้าง…" : "สร้างร้านค้า"}</button></div></form>}</section></div>}
  </>;
}
