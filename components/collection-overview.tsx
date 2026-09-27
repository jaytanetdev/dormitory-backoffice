"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { InvoiceDto } from "@/lib/api-types";
import { receivedAmount } from "@/lib/billing-utils";
import {
  collectionStatus,
  outstandingAmount,
  type CollectionStatus,
} from "@/lib/collection";
const groups: {
  key: CollectionStatus;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: "PAID",
    label: "ชำระครบ",
    description: "ยอดอนุมัติครบแล้ว",
    color: "var(--teal)",
  },
  {
    key: "REVIEW",
    label: "รอตรวจสลิป",
    description: "ส่งหลักฐานแล้ว",
    color: "var(--amber)",
  },
  {
    key: "PARTIAL",
    label: "ชำระบางส่วน",
    description: "ยังมียอดคงเหลือ",
    color: "#aa7b40",
  },
  {
    key: "UNPAID",
    label: "ยังไม่ชำระ",
    description: "ยังไม่มียอดอนุมัติ",
    color: "var(--accent)",
  },
  {
    key: "OVERDUE",
    label: "เกินกำหนด",
    description: "ต้องติดตาม",
    color: "var(--coral)",
  },
];
const money = (n: number) =>
  "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
export function CollectionOverview({ invoices }: { invoices: InvoiceDto[] }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return (
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")
    );
  });
  const [filter, setFilter] = useState<CollectionStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
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
          ? [
              invoice.period.year +
                "-" +
                String(invoice.period.month).padStart(2, "0"),
            ]
          : [],
      ),
    ]),
  ]
    .sort()
    .reverse();
  const selected = issued.filter(
    (invoice) =>
      invoice.period &&
      invoice.period.year +
        "-" +
        String(invoice.period.month).padStart(2, "0") ===
        period,
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
  const label = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("th-TH", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
  };
  return (
    <section className="panel collection-overview">
      <div className="panel-head">
        <div>
          <h2>ใครจ่ายแล้ว ใครยังค้าง</h2>
          <p>เลือกสถานะเพื่อดูบิลและผู้เช่าที่ต้องดำเนินการ</p>
        </div>
        <label className="collection-period">
          รอบบิล
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setFilter("ALL");
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
          <div>
            <span>รับชำระของรอบนี้</span>
            <strong>
              {money(received)} <small>จาก {money(total)}</small>
            </strong>
          </div>
          <b>{progress.toFixed(0)}%</b>
          <div className="collection-track">
            <i style={{ width: progress + "%" }} />
          </div>
          <p>คงเหลือ {money(due)} · เฉพาะยอดที่ตรวจอนุมัติแล้ว</p>
        </div>
        <div
          className="collection-status-chart"
          aria-label="กราฟจำนวนบิลตามสถานะ กดเพื่อกรองรายชื่อ"
        >
          {groups.map((group) => {
            const count = rows.filter((row) => row.status === group.key).length;
            const max = Math.max(
              1,
              ...groups.map(
                (item) => rows.filter((row) => row.status === item.key).length,
              ),
            );
            return (
              <button
                key={group.key}
                aria-pressed={filter === group.key}
                onClick={() =>
                  setFilter((current) =>
                    current === group.key ? "ALL" : group.key,
                  )
                }
              >
                <span className="collection-bar-label">
                  <i style={{ background: group.color }} />
                  {group.label}
                </span>
                <span className="collection-bar-track">
                  <i
                    style={{
                      width: (count / max) * 100 + "%",
                      background: group.color,
                    }}
                  />
                </span>
                <b>{count} บิล</b>
              </button>
            );
          })}
        </div>
      </div>
      <div className="collection-toolbar">
        <input
          className="search"
          aria-label="ค้นหาห้อง ผู้เช่า หรือเลขบิล"
          placeholder="ค้นหาห้อง ผู้เช่า หรือเลขบิล"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="button secondary"
          aria-pressed={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        >
          ทั้งหมด {rows.length} บิล
        </button>
        <span>
          {filter === "ALL"
            ? "ทุกสถานะ"
            : groups.find((group) => group.key === filter)?.label}{" "}
          · {visible.length} บิล
        </span>
      </div>
      <div className="collection-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>ห้อง / ผู้เช่า</th>
              <th>สถานะ</th>
              <th>รับชำระแล้ว</th>
              <th>คงเหลือ</th>
              <th>ครบกำหนด</th>
              <th>ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ invoice, status, balance }) => (
              <tr key={invoice.id}>
                <td>
                  <strong>ห้อง {invoice.room.number}</strong>
                  <small className="team-email">
                    {invoice.contract.resident.fullName}
                  </small>
                  <small className="team-email">{invoice.number}</small>
                </td>
                <td>
                  <span
                    className="collection-tag"
                    style={{
                      color: groups.find((group) => group.key === status)
                        ?.color,
                    }}
                  >
                    {groups.find((group) => group.key === status)?.label}
                  </span>
                </td>
                <td>{money(receivedAmount(invoice))}</td>
                <td>
                  <strong>{money(balance)}</strong>
                </td>
                <td>
                  {new Intl.DateTimeFormat("th-TH", {
                    day: "numeric",
                    month: "short",
                    timeZone: "Asia/Bangkok",
                  }).format(new Date(invoice.dueDate))}
                </td>
                <td>
                  <Link
                    className="button secondary"
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
                  >
                    {status === "REVIEW" ? "ตรวจสลิป" : "ดูบิล"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className="empty-state">
          {selected.length
            ? "ไม่พบรายการตามตัวกรอง"
            : "ยังไม่มีบิลที่ออกแล้วในรอบนี้ เลือกเดือนอื่นหรือเริ่มออกใบแจ้งหนี้"}
        </p>
      )}
      <p className="collection-footnote">
        จำนวนบิลอาจมากกว่าจำนวนผู้เช่า หากมีหลายห้องหรือหลายสัญญา ·
        บิลร่างและบิลยกเลิกไม่รวมในกราฟ
      </p>
    </section>
  );
}
