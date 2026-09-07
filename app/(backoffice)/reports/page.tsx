"use client";

import { useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { Select } from "@/components/ui/select";
import { useBranch } from "@/components/branch-context";
import { Status } from "@/components/status";
import { useApiQuery } from "@/lib/use-api";
import type { InvoiceDto } from "@/lib/api-types";

const empty: InvoiceDto[] = [];
const money = (value: number | string) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 });

export default function ReportsPage() {
  const { selectedBranch, selectedBranchId, loading: branchesLoading } = useBranch();
  const query = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/invoices` : null, empty);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("all");
  const rows = useMemo(() => query.data.filter((invoice) => invoice.period?.year === Number(year) && (month === "all" || invoice.period?.month === Number(month))), [query.data, year, month]);
  const total = rows.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const exportCsv = () => {
    const header = ["เลขที่ใบแจ้งหนี้", "ห้อง", "ผู้เช่า", "เดือน", "ยอดรวม", "วันครบกำหนด", "สถานะ"];
    const lines = rows.map((invoice) => [invoice.number, invoice.room.number, invoice.contract.resident.fullName, `${invoice.period?.month ?? ""}/${invoice.period?.year ? invoice.period.year + 543 : ""}`, money(invoice.total), new Date(invoice.dueDate).toLocaleDateString("th-TH"), invoice.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `invoice-report-${year}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const years = [0, 1, 2].map((offset) => { const value = String(new Date().getFullYear() - offset); return { value, label: String(Number(value) + 543) }; });
  const months = [{ value: "all", label: "ทุกเดือน" }, ...Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2026, index, 1)) }))];
  const periodLabel = month === "all" ? ("ตลอดปี " + (Number(year) + 543)) : (months.find((item) => item.value === month)?.label + " " + (Number(year) + 543));
  const loading = branchesLoading || (Boolean(selectedBranchId) && query.loading);
  const statuses: Record<string, string> = { DRAFT: "แบบร่าง", ISSUED: "รอชำระ", PENDING_REVIEW: "รอตรวจสลิป", PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", VOID: "ยกเลิก" };
  return <div className="reports-page">
    <header className="report-heading"><div><h1>รายงานใบแจ้งหนี้</h1><p>{selectedBranch ? ("ดูยอดเรียกเก็บและสถานะการชำระของ " + selectedBranch.name) : "เลือกสาขาเพื่อดูรายงาน"}</p></div><span className="report-format">CSV · เปิดใน Excel ได้</span></header>
    <ApiNotice loading={loading} error={query.error} />
    {selectedBranch && <>
      <section className="report-controls" aria-label="ตัวกรองรายงาน">
        <div className="report-controls-title"><span className="report-calendar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg></span><div><h2>ช่วงเวลารายงาน</h2><p>เลือกปีและเดือนที่ต้องการ</p></div></div>
        <div className="report-filter-fields"><label><span>ปี พ.ศ.</span><Select value={year} onValueChange={setYear} options={years} placeholder="เลือกปีรายงาน" /></label><label><span>เดือน</span><Select value={month} onValueChange={setMonth} options={months} placeholder="เลือกเดือนรายงาน" /></label></div>
        <div className="report-export"><button className="button report-download" type="button" onClick={exportCsv} disabled={loading || Boolean(query.error) || !rows.length} aria-describedby="report-export-help"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>ดาวน์โหลด CSV</button><span id="report-export-help">{loading ? "กำลังเตรียมข้อมูล…" : query.error ? "โหลดข้อมูลไม่สำเร็จ" : rows.length ? (rows.length.toLocaleString() + " รายการพร้อมส่งออก") : "ยังไม่มีรายการให้ดาวน์โหลด"}</span></div>
      </section>
      <section className="report-summary" aria-label="สรุปรายงาน"><div><span>ใบแจ้งหนี้ทั้งหมด</span><strong>{rows.length.toLocaleString()}<small>ใบ</small></strong></div><div><span>ยอดเรียกเก็บรวม</span><strong><small>฿</small>{money(total)}</strong></div><div><span>ชำระครบแล้ว</span><strong>{rows.filter((invoice) => invoice.status === "PAID").length.toLocaleString()}<small>ใบ</small></strong></div></section>
      <section className="report-results"><div className="report-results-head"><div><h2>รายการใบแจ้งหนี้</h2><p>{periodLabel}</p></div><span>{rows.length.toLocaleString()} รายการ</span></div><div className="report-table-scroll"><table className="data-table"><thead><tr><th>เลขที่ใบแจ้งหนี้</th><th>ห้อง / ผู้เช่า</th><th>ครบกำหนด</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>{rows.map((invoice) => <tr key={invoice.id}><td>{invoice.number}</td><td><strong>{invoice.room.number}</strong><br /><small>{invoice.contract.resident.fullName}</small></td><td>{new Date(invoice.dueDate).toLocaleDateString("th-TH")}</td><td className="money">฿{money(invoice.total)}</td><td><Status>{statuses[invoice.status] ?? invoice.status}</Status></td></tr>)}</tbody></table></div>{!rows.length && !loading && !query.error && <div className="report-empty"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M14 7h14l8 8v26H14a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Z"/><path d="M28 7v9h8M18 24h11m-11 6h7"/></svg><h3>ยังไม่มีใบแจ้งหนี้ในช่วงนี้</h3><p>ลองเลือกเดือนหรือปีอื่น เพื่อดูรายการย้อนหลัง</p>{month !== "all" && <button className="report-reset" onClick={() => setMonth("all")}>ดูทุกเดือนในปีนี้</button>}</div>}</section>
    </>}
  </div>;
}
