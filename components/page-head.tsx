"use client";

import { FormEvent, useState } from "react";

type PageHeadProps = { eyebrow?: string; title: string; subtitle: string; action?: string; onAction?: (values: { name: string; details: string }) => Promise<boolean> | boolean };

export function PageHead({ eyebrow = "จัดการหอพัก", title, subtitle, action, onAction }: PageHeadProps) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const values = { name: String(form.get("name") || ""), details: String(form.get("details") || "") };
    const ok = await onAction?.(values);
    if (!onAction) window.dispatchEvent(new CustomEvent("page-action", { detail: { action, values } }));
    if (onAction && ok === false) { setBusy(false); return; }
    setSaved(true);
    window.setTimeout(() => { setSaved(false); setBusy(false); setOpen(false); }, 900);
  }
  return <>
    <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action && <button type="button" className="button" onClick={() => setOpen(true)}>＋ {action}</button>}</div>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-label={action} onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><div className="eyebrow">เพิ่มรายการใหม่</div><h2>{action}</h2></div><button type="button" className="icon-button" aria-label="ปิด" onClick={() => setOpen(false)}>×</button></div>
      {saved ? <div className="success-state">บันทึกข้อมูลเรียบร้อยแล้ว</div> : <form onSubmit={submit}><label className="field"><span>ชื่อหรือเลขอ้างอิง</span><input name="name" required autoFocus placeholder="กรอกข้อมูล" disabled={busy} /></label><label className="field"><span>รายละเอียดเพิ่มเติม</span><textarea name="details" rows={3} placeholder="ระบุรายละเอียด (ถ้ามี)" disabled={busy} /></label><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)} disabled={busy}>ยกเลิก</button><button type="submit" className="button" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button></div></form>}
    </section></div>}
  </>;
}
