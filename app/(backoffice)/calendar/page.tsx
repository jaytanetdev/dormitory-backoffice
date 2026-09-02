"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { ApiNotice } from "@/components/api-notice";
import { PageHead } from "@/components/page-head";
import { Status } from "@/components/status";
import { useBranch } from "@/components/branch-context";
import type { InvoiceDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales: { th } });
type PaymentEvent = { invoice: InvoiceDto; title: string; start: Date; end: Date; allDay: true };

export default function CalendarPage() {
  const { selectedBranch, selectedBranchId, loading: branchesLoading } = useBranch();
  const query = useApiQuery(selectedBranchId ? `/branches/${selectedBranchId}/invoices` : null, [] as InvoiceDto[]);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<InvoiceDto | null>(null);
  const events = useMemo<PaymentEvent[]>(() => query.data.filter((invoice) => !["DRAFT", "VOID", "PAID"].includes(invoice.status)).map((invoice) => { const due = new Date(invoice.dueDate); return { invoice, title: `ห้อง ${invoice.room.number} · ${invoice.contract.resident.fullName}`, start: due, end: due, allDay: true }; }), [query.data]);
  const dueToday = useMemo(() => { const today = new Date(); return events.filter((event) => event.start.toDateString() === today.toDateString()); }, [events]);
  const overdue = useMemo(() => { const now = new Date(); return events.filter((event) => event.start < now && event.start.toDateString() !== now.toDateString()); }, [events]);

  return <><PageHead eyebrow="การเงิน" title="ปฏิทินกำหนดชำระ" subtitle={selectedBranch ? `เช็กว่าวันนี้ต้องติดตามใคร · ${selectedBranch.name}` : "เลือกสาขาเพื่อดูปฏิทิน"} /><ApiNotice loading={branchesLoading || query.loading} error={query.error} />{selectedBranch && <><section className="calendar-kpis"><div><small>ต้องติดตามวันนี้</small><strong>{dueToday.length}</strong><span>รายการ</span></div><div><small>ค้างกำหนด</small><strong className="danger-number">{overdue.length}</strong><span>รายการ</span></div><div><small>รายการในปฏิทิน</small><strong>{events.length}</strong><span>ยังไม่ชำระ</span></div></section><section className="panel calendar-panel"><div className="calendar-toolbar-note"><div><span className="eyebrow">กำหนดชำระ</span><p>คลิกรายการในปฏิทินเพื่อดูห้อง ผู้เช่า และยอดที่ต้องติดตาม</p></div><div className="calendar-legend"><span><i className="calendar-dot today" />วันนี้</span><span><i className="calendar-dot overdue" />เกินกำหนด</span><span><i className="calendar-dot upcoming" />รอชำระ</span></div></div><div className="calendar-wrap"><Calendar localizer={localizer} culture="th" events={events} startAccessor="start" endAccessor="end" view={view} date={date} onView={setView} onNavigate={setDate} onSelectEvent={(event) => setSelected((event as PaymentEvent).invoice)} views={["month", "agenda"]} popup messages={{ next: "ถัดไป", previous: "ก่อนหน้า", today: "วันนี้", month: "เดือน", agenda: "รายการ", date: "วันที่", time: "เวลา", event: "รายการ", noEventsInRange: "ไม่มีรายการในช่วงนี้" }} eventPropGetter={(event) => ({ className: (event as PaymentEvent).start < new Date() ? "calendar-event overdue" : "calendar-event upcoming" })} /></div></section></>}{selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="modal calendar-detail-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">รายการที่ต้องติดตาม</span><h2>ห้อง {selected.room.number}</h2><p className="subtitle">{selected.contract.resident.fullName} · ครบกำหนด {new Date(selected.dueDate).toLocaleDateString("th-TH")}</p></div><button className="icon-button" type="button" onClick={() => setSelected(null)} aria-label="ปิด">×</button></div><div className="calendar-detail-summary"><span>เลขที่บิล</span><strong>{selected.number}</strong><span>ยอดที่ต้องชำระ</span><strong>฿{Number(selected.total).toLocaleString("th-TH")}</strong></div><Status>{selected.status === "OVERDUE" ? "เกินกำหนด" : "รอชำระ"}</Status></section></div>}</>;
}
