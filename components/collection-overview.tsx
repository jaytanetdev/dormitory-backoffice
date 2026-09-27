"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import type { InvoiceDto } from "@/lib/api-types";
import { receivedAmount } from "@/lib/billing-utils";
import {
  collectionStatus,
  outstandingAmount,
  type CollectionStatus,
} from "@/lib/collection";
const groups: { key: CollectionStatus; label: string; color: string }[] = [
  { key: "PAID", label: "ชำระครบ", color: "var(--teal)" },
  { key: "REVIEW", label: "รอตรวจสลิป", color: "var(--amber)" },
  { key: "PARTIAL", label: "ชำระบางส่วน", color: "var(--partial)" },
  { key: "UNPAID", label: "ยังไม่ชำระ", color: "var(--accent)" },
  { key: "OVERDUE", label: "เกินกำหนด", color: "var(--coral)" },
];
const money = (n: number) =>
  "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const periodKey = (year: number, month: number) =>
  year + "-" + String(month).padStart(2, "0");
export function CollectionOverview({ invoices }: { invoices: InvoiceDto[] }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return periodKey(now.getFullYear(), now.getMonth() + 1);
  });
  const [filter, setFilter] = useState<CollectionStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(8);
  const [expanded, setExpanded] = useState(false);
  const issued = useMemo(
    () =>
      invoices.filter((invoice) => !["DRAFT", "VOID"].includes(invoice.status)),
    [invoices],
  );
  const periods = [
    ...new Set([
      period,
      ...issued.flatMap((invoice) =>
        invoice.period
          ? [periodKey(invoice.period.year, invoice.period.month)]
          : [],
      ),
    ]),
  ]
    .sort()
    .reverse();
  const selected = issued.filter(
    (invoice) =>
      invoice.period &&
      periodKey(invoice.period.year, invoice.period.month) === period,
  );
  const rows = selected.map((invoice) => ({
    invoice,
    status: collectionStatus(invoice),
    balance: outstandingAmount(invoice),
  }));
  const visible = rows
    .filter(
      (row) =>
        (filter === "ALL" || row.status === filter) &&
        (
          row.invoice.room.number +
          " " +
          row.invoice.contract.resident.fullName +
          " " +
          row.invoice.number
        )
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => b.balance - a.balance);
  const total = selected.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  const received = selected.reduce(
    (sum, invoice) => sum + receivedAmount(invoice),
    0,
  );
  const due = rows.reduce((sum, row) => sum + row.balance, 0);
  const progress = total ? Math.min(100, (received / total) * 100) : 0;
  const counts = groups.map((group) => ({
    ...group,
    count: rows.filter((row) => row.status === group.key).length,
  }));
  const max = Math.max(1, ...counts.map((group) => group.count));
  const label = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("th-TH", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
  };
  function choose(status: CollectionStatus | "ALL") {
    setExpanded(true);
    setFilter(status);
    setLimit(8);
  }
  return (
    <section className="panel collection-overview">
      <div className="panel-head">
        <div>
          <h2>การเก็บเงิน</h2>
          <p>เลือกสถานะเพื่อดูว่าใครจ่ายแล้ว ใครยังค้าง</p>
        </div>
        <label className="collection-period">
          <span>รอบบิล</span>
          <select
            aria-label="รอบบิล"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              choose("ALL");
            }}
          >
            {periods.map((key) => (
              <option value={key} key={key}>
                {label(key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="collection-body">
        <div className="collection-progress">
          <div className="collection-main-amount">
            <span>รับชำระแล้ว</span>
            <strong>{money(received)}</strong>
            <p>จากยอดเรียกเก็บ {money(total)}</p>
          </div>
          <div className="collection-progress-caption">
            <span>เก็บเงินได้แล้ว</span>
            <b>{progress.toFixed(0)}%</b>
          </div>
          <div
            className="collection-track"
            role="progressbar"
            aria-label="สัดส่วนยอดรับชำระแล้ว"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: progress + "%" }} />
          </div>
          <div className="collection-due">
            <span>ยังคงเหลือ</span>
            <strong>{money(due)}</strong>
          </div>
          <small>นับเฉพาะยอดที่ตรวจอนุมัติแล้ว</small>
        </div>
        <div
          className="collection-status-chart"
          aria-label="กราฟจำนวนบิลตามสถานะ กดเพื่อกรองรายชื่อ"
        >
          <p className="collection-chart-hint">
            สถานะบิล <span>{rows.length} บิล</span>
          </p>
          {counts.map((group) => (
            <button
              key={group.key}
              aria-pressed={filter === group.key}
              onClick={() => choose(filter === group.key ? "ALL" : group.key)}
            >
              <span className="collection-bar-label">
                <i style={{ background: group.color }} />
                {group.label}
              </span>
              <span className="collection-bar-track">
                <i
                  style={{
                    width: (group.count / max) * 100 + "%",
                    background: group.color,
                  }}
                />
              </span>
              <b>
                {group.count}
                <small> บิล</small>
              </b>
            </button>
          ))}
        </div>
      </div>
      <div className="collection-toolbar">
        <h3>
          {filter === "ALL"
            ? "รายชื่อผู้เช่า"
            : groups.find((group) => group.key === filter)?.label}
          <small>{visible.length} บิล</small>
        </h3>
        <input
          className="search"
          aria-label="ค้นหาห้อง ผู้เช่า หรือเลขบิล"
          placeholder="ค้นหาห้อง หรือชื่อผู้เช่า"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setExpanded(true);
            setLimit(8);
          }}
        />
        <button
          className="button secondary collection-list-toggle"
          aria-expanded={expanded}
          aria-controls="collection-residents"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "พับรายชื่อ" : "ดูรายชื่อผู้เช่า"}
        </button>
        {(filter !== "ALL" || search) && (
          <button
            className="button secondary"
            onClick={() => {
              choose("ALL");
              setSearch("");
            }}
          >
            ดูทั้งหมด
          </button>
        )}
      </div>
      <div id="collection-residents" hidden={!expanded}>
        <div className="collection-list-head" aria-hidden="true">
          <span>ห้อง / ผู้เช่า</span>
          <span>สถานะ</span>
          <span>ยอดคงเหลือ</span>
          <span />
        </div>
        <ul className="collection-list" aria-label="รายการบิลตามสถานะ">
          {visible.slice(0, limit).map(({ invoice, status, balance }) => {
            const group = groups.find((group) => group.key === status)!;
            return (
              <li role="listitem" key={invoice.id}>
                <div className="collection-resident">
                  <span className="collection-room">{invoice.room.number}</span>
                  <div>
                    <strong>{invoice.contract.resident.fullName}</strong>
                    <small>{invoice.number}</small>
                    <small>
                      ครบกำหนด{" "}
                      {new Intl.DateTimeFormat("th-TH", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Bangkok",
                      }).format(new Date(invoice.dueDate))}
                    </small>
                  </div>
                </div>
                <span
                  className="collection-tag"
                  style={{
                    color: group.color,
                    background:
                      "color-mix(in srgb, " +
                      group.color +
                      " 10%, var(--surface))",
                  }}
                >
                  <i style={{ background: group.color }} />
                  {group.label}
                </span>
                <div className="collection-row-amount">
                  <strong>{money(balance)}</strong>
                  <small>
                    {status === "PAID"
                      ? "ชำระครบแล้ว"
                      : "รับแล้ว " + money(receivedAmount(invoice))}
                  </small>
                </div>
                <Link
                  className={
                    "button " + (status === "REVIEW" ? "" : "secondary")
                  }
                  href={
                    status === "REVIEW"
                      ? "/payments"
                      : "/bills?view=done&year=" +
                        invoice.period?.year +
                        "&month=" +
                        invoice.period?.month +
                        "&query=" +
                        encodeURIComponent(invoice.number)
                  }
                  aria-label={
                    (status === "REVIEW" ? "ตรวจสลิป" : "ดูบิล") +
                    " ห้อง " +
                    invoice.room.number
                  }
                >
                  {status === "REVIEW" ? "ตรวจสลิป" : "ดูบิล"}
                  <Icon name="bill" />
                </Link>
              </li>
            );
          })}
        </ul>
        {!visible.length && (
          <p className="empty-state">
            {selected.length
              ? "ไม่พบรายการ ลองเปลี่ยนสถานะหรือคำค้น"
              : "ยังไม่มีบิลที่ออกแล้วในเดือนนี้"}
          </p>
        )}
        {visible.length > limit && (
          <button
            className="collection-show-more"
            onClick={() => setLimit((current) => current + 8)}
          >
            ดูเพิ่มอีก {Math.min(8, visible.length - limit)} บิล
          </button>
        )}
      </div>
      <p className="collection-footnote">
        {expanded
          ? "หนึ่งรายการต่อหนึ่งบิล ผู้เช่าที่มีหลายห้องอาจมีหลายรายการ"
          : "กดสถานะในกราฟ หรือค้นหาห้องเพื่อดูรายชื่อผู้เช่า"}
      </p>
    </section>
  );
}
