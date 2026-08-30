"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { apiMutation } from "@/lib/api";
import type { PaymentDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const noPayments: PaymentDto[] = [];

export default function PaymentsPage() {
  const { selectedBranch, selectedBranchId, loading: branchesLoading } = useBranch();
  const query = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/payments/pending` : null, noPayments);
  const [items, setItems] = useState<PaymentDto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setItems(query.data), [query.data]);

  async function approve(id: string) {
    setBusy(id); setError(null);
    const result = await apiMutation(`/payments/${id}/approve`, {});
    setBusy(null);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => current.filter((item) => item.id !== id));
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
      <div className="table-wrap"><table className="data-table"><thead><tr><th>รายการ</th><th>ห้อง / ผู้เช่า</th><th>เวลาที่แจ้ง</th><th>ยอดโอน</th><th>สถานะ</th><th>ตรวจสอบ</th></tr></thead><tbody>
        {items.map((payment) => <tr key={payment.id}><td className="mono">{payment.id}</td><td><strong>{payment.invoice.room.number}</strong><br /><small>{payment.invoice.contract.resident.fullName}</small></td><td>{new Date(payment.createdAt).toLocaleString("th-TH")}</td><td className="money">฿{Number(payment.amount).toLocaleString()}</td><td><Status>รอตรวจสลิป</Status></td><td><button className="button" disabled={busy === payment.id} onClick={() => void approve(payment.id)}>{busy === payment.id ? "กำลังอนุมัติ…" : "อนุมัติยอด"}</button></td></tr>)}
      </tbody></table>{!items.length && !query.loading && <p className="empty-state">ไม่มีรายการรอตรวจสอบในสาขานี้</p>}</div>
    </>}
  </>;
}
