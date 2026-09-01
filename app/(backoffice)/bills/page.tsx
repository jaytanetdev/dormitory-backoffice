"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { apiGet, apiMutation } from "@/lib/api";
import type { InvoiceDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

type Contract = { id: string; status: string; monthlyRent: number | string; room: { id: string; number: string }; resident: { fullName: string } };
type Period = { id: string; year: number; month: number; dueDate: string };
type Reading = { id: string; currentValue: number | string; unitRate: number | string; readingDate: string };
type LatestReadings = { WATER: Reading | null; ELECTRIC: Reading | null };
type MeterForm = { previous: number; current: number; rate: number; hasHistory: boolean };

const noInvoices: InvoiceDto[] = [];
const noContracts: Contract[] = [];
const emptyMeters: LatestReadings = { WATER: null, ELECTRIC: null };
const statuses: Record<string, string> = { DRAFT: "แบบร่าง", ISSUED: "รอชำระ", PENDING_REVIEW: "รอตรวจสลิป", PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", VOID: "ยกเลิก" };
const today = () => new Date().toISOString().slice(0, 10);

export default function BillsPage() {
  const { selectedBranchId: branchId, loading: branchesLoading } = useBranch();
  const invoices = useApiQuery(branchId ? `/branches/${branchId}/invoices` : null, noInvoices);
  const contracts = useApiQuery(branchId ? `/branches/${branchId}/contracts` : null, noContracts);
  const [items, setItems] = useState<InvoiceDto[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState("");
  const [meterLoading, setMeterLoading] = useState(false);
  const [water, setWater] = useState<MeterForm>({ previous: 0, current: 0, rate: 0, hasHistory: false });
  const [electric, setElectric] = useState<MeterForm>({ previous: 0, current: 0, rate: 0, hasHistory: false });
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [roomFilter, setRoomFilter] = useState<"all" | "missing" | "done">("missing");

  const activeContracts = useMemo(() => contracts.data.filter((contract) => contract.status === "ACTIVE"), [contracts.data]);
  const selectedContract = activeContracts.find((contract) => contract.id === contractId);
  const selectedRoomId = selectedContract?.room.id;
  const monthBills = useMemo(() => items.filter((bill) => bill.period?.year === billingYear && bill.period.month === billingMonth), [items, billingMonth, billingYear]);
  const billedContractIds = useMemo(() => new Set(monthBills.map((bill) => bill.contract.id).filter(Boolean)), [monthBills]);
  const missingContracts = useMemo(() => activeContracts.filter((contract) => !billedContractIds.has(contract.id)), [activeContracts, billedContractIds]);
  useEffect(() => setItems(invoices.data), [invoices.data]);
  useEffect(() => { if (open && !contractId && missingContracts[0]) setContractId(missingContracts[0].id); }, [missingContracts, contractId, open]);
  useEffect(() => {
    if (!selectedRoomId) return;
    let active = true;
    setMeterLoading(true);
    void apiGet(`/rooms/${selectedRoomId}/meter-readings/latest`, emptyMeters).then((result) => {
      if (!active) return;
      setMeterLoading(false);
      if (!result.ok) { setError(result.message); return; }
      const waterPrevious = Number(result.data.WATER?.currentValue ?? 0);
      const electricPrevious = Number(result.data.ELECTRIC?.currentValue ?? 0);
      setWater({ previous: waterPrevious, current: waterPrevious, rate: Number(result.data.WATER?.unitRate ?? 0), hasHistory: Boolean(result.data.WATER) });
      setElectric({ previous: electricPrevious, current: electricPrevious, rate: Number(result.data.ELECTRIC?.unitRate ?? 0), hasHistory: Boolean(result.data.ELECTRIC) });
    });
    return () => { active = false; };
  }, [selectedRoomId]);

  const visible = useMemo(() => items.filter((bill) => (!query || `${bill.number} ${bill.room.number} ${bill.contract.resident.fullName}`.toLowerCase().includes(query.toLowerCase())) && (roomFilter === "all" || (roomFilter === "done" ? monthBills.some((item) => item.id === bill.id) : !monthBills.some((item) => item.id === bill.id)))), [items, monthBills, query, roomFilter]);
  const amount = (bill: InvoiceDto, ...codes: string[]) => Number(bill.items.find((item) => codes.includes(item.code ?? item.type ?? ""))?.amount ?? 0);
  const waterUnits = Math.max(0, water.current - water.previous);
  const electricUnits = Math.max(0, electric.current - electric.previous);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !selectedContract) return;
    if (water.current < water.previous || electric.current < electric.previous) { setError("เลขมิเตอร์เดือนนี้ต้องไม่น้อยกว่าเลขครั้งก่อน"); return; }
    setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const year = billingYear;
    const month = billingMonth;
    const dueDate = String(form.get("dueDate"));
    const readingDate = new Date(`${String(form.get("readingDate"))}T12:00:00`).toISOString();
    const rent = Number(form.get("rent"));
    const period = await apiMutation<Period>(`/branches/${branchId}/billing-periods`, { year, month, dueDate });
    if (!period.ok) { setBusy(false); setError(period.message); return; }
    const lineItems = [
      { code: "RENT", description: "ค่าเช่า", quantity: 1, unitPrice: rent },
      ...(waterUnits > 0 ? [{ code: "WATER", description: "ค่าน้ำ", quantity: waterUnits, unitPrice: water.rate, metadata: { previousValue: water.previous, currentValue: water.current } }] : []),
      ...(electricUnits > 0 ? [{ code: "ELECTRIC", description: "ค่าไฟ", quantity: electricUnits, unitPrice: electric.rate, metadata: { previousValue: electric.previous, currentValue: electric.current } }] : []),
    ];
    const meterReadings = [
      { type: "WATER", readingDate, previousValue: water.previous, currentValue: water.current, unitRate: water.rate },
      { type: "ELECTRIC", readingDate, previousValue: electric.previous, currentValue: electric.current, unitRate: electric.rate },
    ];
    const result = await apiMutation<InvoiceDto>("/invoices", { branchId, periodId: period.data.id, contractId, number: `INV-${year}${String(month).padStart(2, "0")}-${selectedContract.room.number}-${Date.now().toString().slice(-5)}`, discount: 0, items: lineItems, meterReadings });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    const mappedItems = lineItems.map((item) => ({ ...item, amount: item.quantity * item.unitPrice }));
    setItems((current) => [{ ...result.data, status: "DRAFT", room: { number: selectedContract.room.number }, contract: { resident: { fullName: selectedContract.resident.fullName } }, items: mappedItems }, ...current]);
    setOpen(false); setContractId("");
  }

  async function issue(invoiceId: string) {
    setIssuingId(invoiceId); setError(null);
    const result = await apiMutation<{ invoice: InvoiceDto }>(`/invoices/${invoiceId}/issue`, {});
    setIssuingId(null);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: "ISSUED" } : invoice));
  }

  return <>
    <PageHead eyebrow="การเงิน" title="ใบแจ้งหนี้" subtitle="อ่านมิเตอร์ คำนวณค่าน้ำค่าไฟ และออกบิลแจ้งผู้เช่าทาง LINE" />
    <div className="page-head-actions"><button className="button" onClick={() => { setError(null); setOpen(true); }}>＋ สร้างใบแจ้งหนี้</button></div>
    <ApiNotice loading={branchesLoading || invoices.loading || contracts.loading} error={invoices.error || contracts.error || error} />
    <section className="billing-overview"><div><span className="eyebrow">รอบบิลที่กำลังทำ</span><h2>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(billingYear, billingMonth - 1, 1))}</h2><p>เช็กห้องที่ทำแล้วก่อนเริ่มออกบิลรอบนี้</p></div><div className="billing-period-fields"><label>เดือน<select value={billingMonth} onChange={(event) => setBillingMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2026, index, 1))}</option>)}</select></label><label>ปี<input type="number" value={billingYear} onChange={(event) => setBillingYear(Number(event.target.value))} /></label></div><div className="billing-progress"><strong>{monthBills.length} <small>/ {activeContracts.length}</small></strong><span>ห้องที่ออกบิลแล้ว</span><div><i style={{ width: `${activeContracts.length ? Math.min(100, monthBills.length / activeContracts.length * 100) : 0}%` }} /></div><em>{missingContracts.length ? `เหลืออีก ${missingContracts.length} ห้อง` : "ครบทุกห้องแล้ว"}</em></div></section>
    {open && <div className="modal-backdrop"><section className="modal bill-modal"><div className="modal-head"><div><h2>สร้างใบแจ้งหนี้รายเดือน</h2><p className="subtitle">เลขครั้งก่อนดึงจากประวัติมิเตอร์ล่าสุดของห้อง</p></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>
      <form onSubmit={create}>
        <div className="modal-period-note"><span>รอบบิล</span><strong>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(billingYear, billingMonth - 1, 1))}</strong><small>{missingContracts.length ? `เลือกได้เฉพาะ ${missingContracts.length} ห้องที่ยังไม่มีบิล` : "รอบนี้ออกครบทุกห้องแล้ว"}</small></div>
        <label className="field"><span>สัญญา / ห้อง</span><select value={contractId} onChange={(event) => setContractId(event.target.value)} required><option value="">เลือกห้องที่ยังไม่ออกบิล</option>{missingContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.room.number} · {contract.resident.fullName}</option>)}</select></label>
        <input name="year" type="hidden" value={billingYear} readOnly /><input name="month" type="hidden" value={billingMonth} readOnly />
        <div className="form-row"><label className="field"><span>วันที่จดมิเตอร์</span><input name="readingDate" type="date" defaultValue={today()} required /></label><label className="field"><span>วันครบกำหนด</span><input name="dueDate" type="date" required /></label></div>
        <label className="field"><span>ค่าเช่า</span><input name="rent" type="number" min="0" step="0.01" value={selectedContract ? Number(selectedContract.monthlyRent) : 0} readOnly /></label>
        <div className="meter-entry-grid">
          <MeterEntry title="มิเตอร์น้ำ" loading={meterLoading} value={water} onChange={setWater} units={waterUnits} />
          <MeterEntry title="มิเตอร์ไฟ" loading={meterLoading} value={electric} onChange={setElectric} units={electricUnits} />
        </div>
        <div className="bill-preview"><span>ค่าน้ำ ฿{(waterUnits * water.rate).toLocaleString()}</span><span>ค่าไฟ ฿{(electricUnits * electric.rate).toLocaleString()}</span><strong>รวม ฿{(Number(selectedContract?.monthlyRent ?? 0) + waterUnits * water.rate + electricUnits * electric.rate).toLocaleString()}</strong></div>
        <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)}>ยกเลิก</button><button className="button" disabled={busy || meterLoading || !selectedContract}>{busy ? "กำลังบันทึก…" : "บันทึกแบบร่าง"}</button></div>
      </form>
    </section></div>}
    <div className="toolbar"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขบิล ห้อง หรือผู้เช่า" /><select className="filter" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value as typeof roomFilter)}><option value="missing">ยังไม่ออกบิล · {missingContracts.length}</option><option value="done">ออกบิลแล้ว · {monthBills.length}</option><option value="all">ทุกใบแจ้งหนี้</option></select></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>เลขที่</th><th>ห้อง / ผู้เช่า</th><th>ค่าเช่า</th><th>น้ำ</th><th>ไฟ</th><th>ยอดรวม</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>{visible.map((bill) => <tr key={bill.id}><td className="mono">{bill.number}</td><td><strong>{bill.room.number}</strong><br /><small>{bill.contract.resident.fullName}</small></td><td>฿{amount(bill, "RENT").toLocaleString()}</td><td>฿{amount(bill, "WATER").toLocaleString()}</td><td>฿{amount(bill, "ELECTRIC", "ELECTRICITY").toLocaleString()}</td><td><strong>฿{Number(bill.total).toLocaleString()}</strong></td><td><Status>{statuses[bill.status] ?? bill.status}</Status></td><td>{bill.status === "DRAFT" ? <button className="room-invite-button" disabled={issuingId === bill.id} onClick={() => void issue(bill.id)}>{issuingId === bill.id ? "กำลังส่ง…" : "ออกบิล + แจ้ง LINE"}</button> : <span className="table-muted">—</span>}</td></tr>)}</tbody></table>{!visible.length && !invoices.loading && <p className="empty-state">ยังไม่มีใบแจ้งหนี้</p>}</div>
  </>;
}

function MeterEntry({ title, loading, value, units, onChange }: { title: string; loading: boolean; value: MeterForm; units: number; onChange: (value: MeterForm) => void }) {
  return <fieldset className="meter-entry"><legend>{title}</legend><label><span>ครั้งก่อน</span><input type="number" min="0" step="0.001" value={value.previous} readOnly={value.hasHistory} disabled={loading} onChange={(event) => onChange({ ...value, previous: Number(event.target.value) })} /></label><label><span>ครั้งนี้</span><input type="number" min={value.previous} step="0.001" value={value.current} disabled={loading} onChange={(event) => onChange({ ...value, current: Number(event.target.value) })} /></label><label><span>บาท / หน่วย</span><input type="number" min="0" step="0.01" value={value.rate} disabled={loading} onChange={(event) => onChange({ ...value, rate: Number(event.target.value) })} /></label><div><span>{value.hasHistory ? "ใช้ไป" : "ครั้งแรก · ตั้งเลขเริ่มต้นได้"}</span><strong>{units.toLocaleString()} หน่วย</strong></div></fieldset>;
}
