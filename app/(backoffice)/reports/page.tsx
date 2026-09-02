"use client";

import { useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { PageHead } from "@/components/page-head";
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
    const lines = rows.map((invoice) => [invoice.number, invoice.room.number, invoice.contract.resident.fullName, `${invoice.period?.month ?? ""}/${invoice.period?.year ?? ""}`, money(invoice.total), new Date(invoice.dueDate).toLocaleDateString("th-TH"), invoice.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `invoice-report-${year}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <><PageHead eyebrow="รายงานการเงิน" title="รายงานใบแจ้งหนี้" subtitle={selectedBranch ? `สรุปข้อมูลของ ${selectedBranch.name} สำหรับดาวน์โหลดหรือส่งต่อ` : "เลือกสาขาเพื่อดูรายงาน"} /><ApiNotice loading={branchesLoading || query.loading} error={query.error} />{selectedBranch && <><section className="report-toolbar"><label className="field"><span>ปี</span><select value={year} onChange={(event) => setYear(event.target.value)}>{[0, 1, 2].map((offset) => <option key={offset}>{String(new Date().getFullYear() - offset)}</option>)}</select></label><label className="field"><span>เดือน</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">ทุกเดือน</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><button className="button" type="button" onClick={exportCsv} disabled={!rows.length}>ดาวน์โหลด CSV</button></section><section className="summary-strip"><div className="metric"><small>ใบแจ้งหนี้</small><strong className="mono">{rows.length.toLocaleString()}</strong></div><div className="metric"><small>ยอดรวม</small><strong className="mono">฿{money(total)}</strong></div><div className="metric"><small>ชำระแล้ว</small><strong className="mono">{rows.filter((invoice) => invoice.status === "PAID").length.toLocaleString()}</strong></div></section><div className="table-wrap"><table className="data-table"><thead><tr><th>เลขที่</th><th>ห้อง / ผู้เช่า</th><th>ครบกำหนด</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>{rows.map((invoice) => <tr key={invoice.id}><td className="mono">{invoice.number}</td><td><strong>{invoice.room.number}</strong><br /><small>{invoice.contract.resident.fullName}</small></td><td>{new Date(invoice.dueDate).toLocaleDateString("th-TH")}</td><td className="money">฿{money(invoice.total)}</td><td>{invoice.status}</td></tr>)}</tbody></table>{!rows.length && !query.loading && <p className="empty-state">ไม่พบข้อมูลตามช่วงเวลาที่เลือก</p>}</div></>}</>;
}
