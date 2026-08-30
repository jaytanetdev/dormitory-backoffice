"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { PageHead } from "@/components/page-head";
import { apiMutation } from "@/lib/api";
import { useApiQuery } from "@/lib/use-api";

type PromptPayType = "PHONE" | "TAX_ID" | "NATIONAL_ID" | "EWALLET";
type PromptPaySetting = {
  id: string;
  branchId: string;
  type: PromptPayType;
  target: string;
  accountName: string;
  enabled: boolean;
  previewAmount: number;
  qrDataUrl: string;
};

export default function Settings() {
  const { selectedBranchId: branchId, selectedBranch, loading: branchesLoading } = useBranch();
  const setting = useApiQuery<PromptPaySetting | null>(branchId ? `/branches/${branchId}/promptpay` : null, null);
  const [type, setType] = useState<PromptPayType>("PHONE");
  const [target, setTarget] = useState("");
  const [accountName, setAccountName] = useState("");
  const [preview, setPreview] = useState<PromptPaySetting | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = setting.data;
    setType(value?.type ?? "PHONE");
    setTarget(value?.target ?? "");
    setAccountName(value?.accountName ?? "");
    setPreview(value);
    setSaved(false);
    setError(null);
  }, [branchId, setting.data]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) return;
    setSaving(true); setSaved(false); setError(null);
    const result = await apiMutation<PromptPaySetting>(`/branches/${branchId}/promptpay`, {
      type,
      target: target.trim(),
      accountName: accountName.trim(),
    }, "PUT");
    setSaving(false);
    if (!result.ok) { setError(result.message); return; }
    setPreview(result.data);
    setTarget(result.data.target);
    setAccountName(result.data.accountName);
    setSaved(true);
  }

  const targetHelp = type === "PHONE"
    ? "กรอกเบอร์โทรศัพท์ 10 หลัก เช่น 0812345678"
    : type === "EWALLET"
      ? "กรอกหมายเลข e-Wallet ที่ลงทะเบียน PromptPay"
      : "กรอกเลข 13 หลักโดยไม่ต้องใส่ขีด";

  return <>
    <PageHead title="ตั้งค่า PromptPay" subtitle="กำหนดบัญชีรับเงินแยกตามสาขา ระบบจะสร้าง QR ตามยอดใบแจ้งหนี้อัตโนมัติ" />
    <ApiNotice loading={branchesLoading || setting.loading} error={setting.error || error} />

    {!branchId ? <section className="form-panel promptpay-empty"><h2>ยังไม่ได้เลือกสาขา</h2><p>เลือกสาขาจากเมนูด้านบนก่อนตั้งค่าบัญชี PromptPay</p></section> : <div className="settings-grid promptpay-settings">
      <form className="form-panel" onSubmit={submit}>
        <div className="promptpay-panel-head"><div><span className="eyebrow">บัญชีรับเงินของสาขา</span><h2>{selectedBranch?.name}</h2></div>{preview?.enabled && <span className="promptpay-active"><i />พร้อมใช้งาน</span>}</div>

        <label className="field"><span>ประเภท PromptPay</span><select value={type} onChange={(event) => setType(event.target.value as PromptPayType)} disabled={saving}><option value="PHONE">เบอร์โทรศัพท์</option><option value="TAX_ID">เลขประจำตัวผู้เสียภาษี</option><option value="NATIONAL_ID">เลขบัตรประชาชน</option><option value="EWALLET">e-Wallet</option></select></label>
        <label className="field"><span>หมายเลขที่ผูก PromptPay</span><input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="numeric" placeholder={type === "PHONE" ? "0812345678" : "กรอกหมายเลข PromptPay"} required disabled={saving} /><p className="help">{targetHelp}</p></label>
        <label className="field"><span>ชื่อบัญชีที่แสดงให้ผู้เช่า</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="เช่น หอพักสุขใจ" required disabled={saving} /></label>

        <button className="button promptpay-save" disabled={saving || !target.trim() || !accountName.trim()}>{saving ? <><span className="button-spinner" />กำลังบันทึก…</> : "บันทึกการตั้งค่า"}</button>
        {saved && <p className="promptpay-saved" role="status">✓ บันทึก PromptPay สำหรับ {selectedBranch?.name} แล้ว</p>}
      </form>

      <section className="form-panel promptpay-preview">
        <div><span className="eyebrow">ตรวจสอบก่อนใช้งาน</span><h2>ตัวอย่าง QR จริง</h2><p className="subtitle">QR นี้สร้างด้วยข้อมูลที่บันทึกของสาขาปัจจุบัน</p></div>
        {preview?.qrDataUrl ? <div className="promptpay-qr-card"><Image src={preview.qrDataUrl} alt="ตัวอย่าง QR PromptPay" width={210} height={210} unoptimized /><strong>฿{preview.previewAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</strong><span>{preview.accountName}</span><small>{preview.target}</small></div> : <div className="promptpay-no-preview"><div>QR</div><strong>ยังไม่ได้ตั้งค่า</strong><p>กรอกข้อมูลแล้วกดบันทึก เพื่อดู QR ที่สร้างจาก Backend จริง</p></div>}
        <p className="help">เมื่อออกใบแจ้งหนี้ ระบบจะใช้บัญชีของสาขานี้และใส่ยอดค้างชำระลงใน QR โดยอัตโนมัติ</p>
      </section>
    </div>}
  </>;
}
