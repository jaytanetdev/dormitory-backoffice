"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { apiMutation } from "@/lib/api";
import type { PaymentDto, ReceiptDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const noPayments: PaymentDto[] = [];

export default function PaymentsPage() {
  const { selectedBranch, selectedBranchId, loading: branchesLoading } = useBranch();
  const query = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/payments/pending` : null, noPayments);
  const [items, setItems] = useState<PaymentDto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);
  const [receipt, setReceipt] = useState<{ payment: PaymentDto; value: ReceiptDto; lateDays: number } | null>(null);
  useEffect(() => setItems(query.data), [query.data]);

  useEffect(() => {
    if (!selectedPayment) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedPayment(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPayment]);

  async function approve(id: string) {
    setBusy(id); setError(null);
    const payment = items.find((item) => item.id === id);
    const result = await apiMutation<{ receipt: ReceiptDto; lateDays: number }>(`/payments/${id}/approve`, {});
    setBusy(null);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => current.filter((item) => item.id !== id));
    if (payment && result.data.receipt) setReceipt({ payment, value: result.data.receipt, lateDays: result.data.lateDays });
  }

  return <>
    <PageHead eyebrow="การเงิน" title="ตรวจสอบการชำระ" subtitle={selectedBranch ? `รายการรอตรวจของ ${selectedBranch.name}` : "เลือกสาขาจากมุมขวาบนเพื่อดูรายการ"} />
    <ApiNotice loading={branchesLoading || query.loading} error={query.error || error} />
    {!selectedBranch ? <section className="empty-state">ยังไม่มีสาขาให้เลือก</section> : <>
      <section className="summary-strip">
        <div className="metric"><small>รอตรวจสอบ</small><strong className="mono">{items.length}</strong></div>
        <div className="metric"><small>ยอดรอตรวจ</small><strong className="mono">฿{items.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}</strong></div>
        <div className="metric"><small>สาขาที่กำลังดู</small><strong style={{ fontSize: 18 }}>{selectedBranch.name}</strong></div>
      </section>
      <div className="table-wrap"><table className="data-table payment-table"><thead><tr><th>รายการ</th><th>ห้อง / ผู้เช่า</th><th>เวลาที่แจ้ง</th><th>ยอดโอน</th><th>หลักฐาน</th><th>สถานะ</th><th>ตรวจสอบ</th></tr></thead><tbody>
        {items.map((payment) => <tr key={payment.id}><td className="mono">{payment.id}</td><td><strong>{payment.invoice.room.number}</strong><br /><small>{payment.invoice.contract.resident.fullName}</small></td><td>{new Date(payment.createdAt).toLocaleString("th-TH")}</td><td className="money">฿{Number(payment.amount).toLocaleString()}</td><td>{payment.slip?.fileUrl ? <button className="slip-preview-button" type="button" onClick={() => setSelectedPayment(payment)}><img src={payment.slip.fileUrl} alt="ตัวอย่างสลิป" /><span>ดูสลิป</span></button> : <span className="table-muted">ไม่มีไฟล์</span>}</td><td><Status>รอตรวจสลิป</Status></td><td><button className="button" disabled={busy === payment.id} onClick={() => void approve(payment.id)}>{busy === payment.id ? "กำลังอนุมัติ…" : "อนุมัติยอด"}</button></td></tr>)}
      </tbody></table>{!items.length && !query.loading && <p className="empty-state">ไม่มีรายการรอตรวจสอบในสาขานี้</p>}</div>
    </>}
    {selectedPayment?.slip?.fileUrl && <div className="slip-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPayment(null); }}><section className="slip-modal" role="dialog" aria-modal="true" aria-labelledby="slip-modal-title"><div className="slip-modal-head"><div><p className="eyebrow">หลักฐานการชำระเงิน</p><h2 id="slip-modal-title">สลิปห้อง {selectedPayment.invoice.room.number}</h2><p>{selectedPayment.invoice.contract.resident.fullName} · ฿{Number(selectedPayment.amount).toLocaleString()}</p></div><button className="icon-button" type="button" aria-label="ปิดหน้าต่าง" onClick={() => setSelectedPayment(null)}>×</button></div><div className="slip-image-wrap"><img src={selectedPayment.slip.fileUrl} alt={`สลิปการชำระเงินของ ${selectedPayment.invoice.contract.resident.fullName}`} /></div><div className="slip-modal-foot"><span className="table-muted">ส่งเมื่อ {new Date(selectedPayment.createdAt).toLocaleString("th-TH")}</span><a className="button secondary" href={selectedPayment.slip.fileUrl} target="_blank" rel="noreferrer">เปิดไฟล์เต็ม ↗</a></div></section></div>}
    {receipt && <div className="slip-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReceipt(null); }}><section className="receipt-card" role="dialog" aria-modal="true"><div className="receipt-head"><div><p className="eyebrow">ออกใบเสร็จสำเร็จ</p><h2>ใบเสร็จรับเงิน</h2></div><button className="icon-button" type="button" onClick={() => setReceipt(null)} aria-label="ปิด">×</button></div><div className="receipt-paper"><strong>{receipt.value.number}</strong><p>ห้อง {receipt.payment.invoice.room.number} · {receipt.payment.invoice.contract.resident.fullName}</p><hr /><div><span>ยอดชำระ</span><b>฿{Number(receipt.value.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</b></div><div><span>ค่าปรับล่าช้า ({receipt.lateDays} วัน)</span><b>฿{Number(receipt.value.lateFee).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</b></div><div className="receipt-total"><span>รวมทั้งสิ้น</span><b>฿{Number(receipt.value.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</b></div></div><div className="slip-modal-foot"><span className="table-muted">สร้างเมื่อ {new Date(receipt.value.issuedAt).toLocaleString("th-TH")}</span><button className="button" type="button" onClick={() => window.print()}>พิมพ์ใบเสร็จ</button></div></section></div>}
  </>;
}
