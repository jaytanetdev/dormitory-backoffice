"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { apiGet, apiMutation } from "@/lib/api";
import type { InvoiceDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

type Contract = { id: string; status: string; startDate: string; monthlyRent: number | string; room: { id: string; number: string }; resident: { fullName: string } };
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
  const invoiceSettings = useApiQuery<{ invoiceDueDays?: number } | null>(branchId ? `/branches/${branchId}/promptpay` : null, null);
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
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  const activeContracts = useMemo(() => contracts.data.filter((contract) => contract.status === "ACTIVE"), [contracts.data]);
  const selectedContract = activeContracts.find((contract) => contract.id === contractId);
  const selectedRoomId = selectedContract?.room.id;
  const monthBills = useMemo(() => items.filter((bill) => bill.period?.year === billingYear && bill.period.month === billingMonth), [items, billingMonth, billingYear]);
  const billedContractIds = useMemo(() => new Set(monthBills.map((bill) => bill.contract.id).filter(Boolean)), [monthBills]);
  const missingContracts = useMemo(() => activeContracts.filter((contract) => !billedContractIds.has(contract.id)), [activeContracts, billedContractIds]);
  const roomBillMap = useMemo(() => activeContracts.map((contract) => ({ contract, invoice: monthBills.find((bill) => bill.contract.id === contract.id) })), [activeContracts, monthBills]);
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
  const defaultDueDate = selectedContract ? (() => { const date = new Date(selectedContract.startDate); date.setDate(date.getDate() + (invoiceSettings.data?.invoiceDueDays ?? 5)); return date.toISOString().slice(0, 10); })() : "";

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !selectedContract) return;
    if (water.current < water.previous || electric.current < electric.previous) { setError("เลขมิเตอร์เดือนนี้ต้องไม่น้อยกว่าเลขครั้งก่อน"); return; }
    setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const year = billingYear;
    const month = billingMonth;
    const dueDate = defaultDueDate || String(form.get("dueDate"));
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
    <section className="panel room-ledger-panel bill-room-map"><div className="room-ledger-head"><div><p className="eyebrow">ผังห้องประจำรอบบิล</p><h2>สถานะใบแจ้งหนี้</h2><p>คลิกที่ห้องเพื่อดูรายละเอียด หรือสร้างบิลสำหรับห้องที่ยังไม่มี</p></div><div className="room-ledger-legend"><span><i className="seat-dot no-bill" />ยังไม่ออกบิล</span><span><i className="seat-dot billed" />ออกบิลแล้ว</span><span><i className="seat-dot paid" />ชำระแล้ว</span></div></div><div className="room-seat-grid bill-room-grid">{roomBillMap.length ? roomBillMap.map(({ contract, invoice }) => { const status = invoice?.status ?? "NO_BILL"; return <button className={`room-seat-card bill-room-card ${status.toLowerCase()}`} type="button" key={contract.id} onClick={() => invoice ? setSelectedInvoice(invoice) : (() => { setContractId(contract.id); setOpen(true); })()}><div className="room-seat-top"><span className="room-seat-number">{contract.room.number}</span><span className="room-seat-building">ห้องพัก</span></div><div className="room-seat-customer"><strong>{contract.resident.fullName}</strong><small>{invoice?.number ?? "ยังไม่มีใบแจ้งหนี้"}</small></div><div className="room-seat-bottom"><span className="invoice-status-dot"><i />{statuses[status] ?? "ยังไม่ออกบิล"}</span>{invoice && <b>฿{Number(invoice.total).toLocaleString()}</b>}</div><span className="room-seat-action">{invoice ? "ดูรายละเอียด ›" : "คลิกเพื่อสร้างบิล +"}</span></button>; }) : <p className="empty-state">ยังไม่มีผู้เช่าที่ใช้งานอยู่สำหรับแสดงผัง</p>}</div></section>
    {selectedInvoice && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedInvoice(null); }}><section className="modal bill-detail-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><p className="eyebrow">รายละเอียดใบแจ้งหนี้</p><h2>ห้อง {selectedInvoice.room.number}</h2><p className="subtitle">{selectedInvoice.contract.resident.fullName} · {selectedInvoice.number}</p></div><button className="icon-button" type="button" onClick={() => setSelectedInvoice(null)} aria-label="ปิด">×</button></div><div className="bill-detail-summary"><span>ยอดรวม</span><strong>฿{Number(selectedInvoice.total).toLocaleString()}</strong><span>สถานะ</span><Status>{statuses[selectedInvoice.status] ?? selectedInvoice.status}</Status></div><div className="bill-detail-items">{selectedInvoice.items.map((item, index) => <div key={`${item.code ?? item.type}-${index}`}><span>{item.type ?? item.code ?? "รายการ"}</span><b>฿{Number(item.amount).toLocaleString()}</b></div>)}</div><div className="modal-actions"><button className="button ghost" type="button" onClick={() => setSelectedInvoice(null)}>ปิด</button>{selectedInvoice.status === "DRAFT" && <button className="button" type="button" disabled={issuingId === selectedInvoice.id} onClick={() => { void issue(selectedInvoice.id); setSelectedInvoice(null); }}>{issuingId === selectedInvoice.id ? "กำลังส่ง…" : "ออกบิล + แจ้ง LINE"}</button>}</div></section></div>}
    <PageHead eyebrow="การเงิน" title="ใบแจ้งหนี้" subtitle="อ่านมิเตอร์ คำนวณค่าน้ำค่าไฟ และออกบิลแจ้งผู้เช่าทาง LINE" />
    <div className="page-head-actions"><button className="button" onClick={() => { setError(null); setOpen(true); }}>＋ สร้างใบแจ้งหนี้</button></div>
    <ApiNotice loading={branchesLoading || invoices.loading || contracts.loading} error={invoices.error || contracts.error || error} />
    <section className="billing-overview"><div><span className="eyebrow">รอบบิลที่กำลังทำ</span><h2>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(billingYear, billingMonth - 1, 1))}</h2><p>เช็กห้องที่ทำแล้วก่อนเริ่มออกบิลรอบนี้</p></div><div className="billing-period-fields"><label>เดือน<Select value={String(billingMonth)} onValueChange={(value) => setBillingMonth(Number(value))} options={Array.from({ length: 12 }, (_, index) => ({ value:String(index + 1), label:new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2026, index, 1)) }))} /></label><label>ปี<Select value={String(billingYear)} onValueChange={(value) => setBillingYear(Number(value))} options={Array.from({ length: 7 }, (_, index) => { const year = new Date().getFullYear() - 5 + index; return { value: String(year), label: String(year) }; })} /></label></div><div className="billing-progress"><strong>{monthBills.length} <small>/ {activeContracts.length}</small></strong><span>ห้องที่ออกบิลแล้ว</span><div><i style={{ width: `${activeContracts.length ? Math.min(100, monthBills.length / activeContracts.length * 100) : 0}%` }} /></div><em>{missingContracts.length ? `เหลืออีก ${missingContracts.length} ห้อง` : "ครบทุกห้องแล้ว"}</em></div></section>
    {open && <div className="modal-backdrop"><section className="modal bill-modal"><div className="modal-head"><div><h2>สร้างใบแจ้งหนี้รายเดือน</h2><p className="subtitle">เลขครั้งก่อนดึงจากประวัติมิเตอร์ล่าสุดของห้อง</p></div><button className="icon-button" onClick={() => setOpen(false)}>×</button></div>
      <form onSubmit={create}>
        <p className="auto-due-date">วันครบกำหนดจะคำนวณอัตโนมัติจากวันเข้าพัก + {invoiceSettings.data?.invoiceDueDays ?? 5} วัน{defaultDueDate ? ` · ${new Date(`${defaultDueDate}T12:00:00`).toLocaleDateString("th-TH")}` : ""}</p>
        <div className="modal-period-note"><span>รอบบิล</span><strong>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(billingYear, billingMonth - 1, 1))}</strong><small>{missingContracts.length ? `เลือกได้เฉพาะ ${missingContracts.length} ห้องที่ยังไม่มีบิล` : "รอบนี้ออกครบทุกห้องแล้ว"}</small></div>
        <label className="field"><span>สัญญา / ห้อง</span><Select value={contractId} onValueChange={setContractId} options={missingContracts.map((contract) => ({ value:contract.id, label:`${contract.room.number} · ${contract.resident.fullName}` }))} placeholder="เลือกห้องที่ยังไม่ออกบิล" /></label>
        <input name="year" type="hidden" value={billingYear} readOnly /><input name="month" type="hidden" value={billingMonth} readOnly />
        <div className="form-row"><label className="field"><span>วันที่จดมิเตอร์</span><DatePicker name="readingDate" defaultValue={today()} required /></label><label className="field"><span>วันครบกำหนด</span><DatePicker name="dueDate" key={contractId} defaultValue={defaultDueDate} required /><p className="help">คำนวณจากวันเข้าพัก + {invoiceSettings.data?.invoiceDueDays ?? 5} วัน (แก้ไขได้)</p></label></div>
        <label className="field"><span>ค่าเช่า</span><input name="rent" type="number" min="0" step="0.01" value={selectedContract ? Number(selectedContract.monthlyRent) : 0} readOnly /></label>
        <div className="meter-entry-grid">
          <MeterEntry title="มิเตอร์น้ำ" loading={meterLoading} value={water} onChange={setWater} units={waterUnits} />
          <MeterEntry title="มิเตอร์ไฟ" loading={meterLoading} value={electric} onChange={setElectric} units={electricUnits} />
        </div>
        <div className="bill-preview"><span>ค่าน้ำ ฿{(waterUnits * water.rate).toLocaleString()}</span><span>ค่าไฟ ฿{(electricUnits * electric.rate).toLocaleString()}</span><strong>รวม ฿{(Number(selectedContract?.monthlyRent ?? 0) + waterUnits * water.rate + electricUnits * electric.rate).toLocaleString()}</strong></div>
        <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)}>ยกเลิก</button><button className="button" disabled={busy || meterLoading || !selectedContract}>{busy ? "กำลังบันทึก…" : "บันทึกแบบร่าง"}</button></div>
      </form>
    </section></div>}
    <div className="toolbar"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขบิล ห้อง หรือผู้เช่า" /><Select className="filter" value={roomFilter} onValueChange={(value) => setRoomFilter(value as typeof roomFilter)} options={[{ value:"missing", label:`ยังไม่ออกบิล · ${missingContracts.length}` }, { value:"done", label:`ออกบิลแล้ว · ${monthBills.length}` }, { value:"all", label:"ทุกใบแจ้งหนี้" }]} /></div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>เลขที่</th><th>ห้อง / ผู้เช่า</th><th>ค่าเช่า</th><th>น้ำ</th><th>ไฟ</th><th>ยอดรวม</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>{visible.map((bill) => <tr key={bill.id}><td className="mono">{bill.number}</td><td><strong>{bill.room.number}</strong><br /><small>{bill.contract.resident.fullName}</small></td><td>฿{amount(bill, "RENT").toLocaleString()}</td><td>฿{amount(bill, "WATER").toLocaleString()}</td><td>฿{amount(bill, "ELECTRIC", "ELECTRICITY").toLocaleString()}</td><td><strong>฿{Number(bill.total).toLocaleString()}</strong></td><td><Status>{statuses[bill.status] ?? bill.status}</Status></td><td>{bill.status === "DRAFT" ? <button className="room-invite-button" disabled={issuingId === bill.id} onClick={() => void issue(bill.id)}>{issuingId === bill.id ? "กำลังส่ง…" : "ออกบิล + แจ้ง LINE"}</button> : <span className="table-muted">—</span>}</td></tr>)}</tbody></table>{!visible.length && !invoices.loading && <p className="empty-state">ยังไม่มีใบแจ้งหนี้</p>}</div>
  </>;
}

function MeterEntry({ title, loading, value, units, onChange }: { title: string; loading: boolean; value: MeterForm; units: number; onChange: (value: MeterForm) => void }) {
  return <fieldset className="meter-entry"><legend>{title}</legend><label><span>ครั้งก่อน</span><input type="number" min="0" step="0.001" value={value.previous} readOnly={value.hasHistory} disabled={loading} onChange={(event) => onChange({ ...value, previous: Number(event.target.value) })} /></label><label><span>ครั้งนี้</span><input type="number" min={value.previous} step="0.001" value={value.current} disabled={loading} onChange={(event) => onChange({ ...value, current: Number(event.target.value) })} /></label><label><span>บาท / หน่วย</span><input type="number" min="0" step="0.01" value={value.rate} disabled={loading} onChange={(event) => onChange({ ...value, rate: Number(event.target.value) })} /></label><div><span>{value.hasHistory ? "ใช้ไป" : "ครั้งแรก · ตั้งเลขเริ่มต้นได้"}</span><strong>{units.toLocaleString()} หน่วย</strong></div></fieldset>;
}
