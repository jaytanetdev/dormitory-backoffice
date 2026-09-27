"use client";

import { receivedAmount } from "@/lib/billing-utils";
import Link from "next/link";
import { useMemo } from "react";
import { collectionStatus } from "@/lib/collection";
import { CollectionOverview } from "@/components/collection-overview";
import { Icon } from "@/components/icons";
import { ApiNotice } from "@/components/api-notice";
import { useBranch } from "@/components/branch-context";
import { useApiQuery } from "@/lib/use-api";
import type { ApiRoom, InvoiceDto, PropertyDto } from "@/lib/api-types";

const noProperties: PropertyDto[] = [];
const noInvoices: InvoiceDto[] = [];
const roomLabel: Record<string, string> = {
  VACANT: "ว่าง",
  OCCUPIED: "มีผู้เช่า",
  RESERVED: "จองแล้ว",
  MAINTENANCE: "ซ่อมบำรุง",
};
const money = (value: number) =>
  `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const monthName = (month: number) =>
  new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
    new Date(2026, month - 1, 1),
  );

type RoomInvoice = ApiRoom & { building: string; invoice?: InvoiceDto };

export default function Dashboard() {
  const {
    selectedBranch,
    selectedBranchId,
    loading: branchesLoading,
  } = useBranch();
  const properties = useApiQuery(
    selectedBranchId ? `/branches/${selectedBranchId}/properties` : null,
    noProperties,
  );
  const invoices = useApiQuery(
    selectedBranchId ? `/branches/${selectedBranchId}/invoices` : null,
    noInvoices,
  );
  const rooms = useMemo(
    () =>
      properties.data.flatMap((property) =>
        property.buildings.flatMap((building) =>
          building.rooms.map((room) => ({ ...room, building: building.name })),
        ),
      ),
    [properties.data],
  );
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);
  const currentInvoices = useMemo(
    () =>
      invoices.data.filter(
        (invoice) =>
          invoice.period?.year === currentPeriod.year &&
          invoice.period.month === currentPeriod.month &&
          invoice.status !== "VOID",
      ),
    [currentPeriod, invoices.data],
  );
  const roomInvoices = useMemo<RoomInvoice[]>(
    () =>
      rooms.map((room) => ({
        ...room,
        invoice: currentInvoices.find((invoice) => invoice.room.id === room.id),
      })),
    [currentInvoices, rooms],
  );
  const stats = useMemo(
    () => ({
      occupied: rooms.filter((room) => room.status === "OCCUPIED").length,
    }),
    [rooms],
  );
  const trend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const bills = invoices.data.filter(
        (invoice) =>
          invoice.period?.year === year &&
          invoice.period.month === month &&
          !["VOID", "DRAFT"].includes(invoice.status),
      );
      return {
        label: monthName(month),
        billed: bills.reduce((sum, bill) => sum + Number(bill.total), 0),
        received: bills.reduce((sum, bill) => sum + receivedAmount(bill), 0),
      };
    });
  }, [invoices.data]);
  const tasks = {
    missing: roomInvoices.filter(
      (room) => room.status === "OCCUPIED" && !room.invoice,
    ).length,
    drafts: currentInvoices.filter((invoice) => invoice.status === "DRAFT")
      .length,
    pending: invoices.data.reduce(
      (sum, invoice) =>
        sum +
        (invoice.payments ?? []).filter(
          (payment) => payment.status === "PENDING",
        ).length,
      0,
    ),
    overdue: invoices.data.filter(
      (invoice) =>
        !["DRAFT", "VOID"].includes(invoice.status) &&
        collectionStatus(invoice) === "OVERDUE",
    ).length,
  };
  const trendMax = Math.max(
    1,
    ...trend.map((item) => Math.max(item.billed, item.received)),
  );
  const loading = branchesLoading || properties.loading || invoices.loading;
  const error = properties.error || invoices.error;

  return (
    <div className="overview-page">
      <header className="overview-heading">
        <div>
          <h1>ภาพรวมหอพัก</h1>
          <p>
            {selectedBranch?.name ?? "เริ่มจัดการหอพักของคุณ"}{" "}
            <span className="overview-date">
              {monthName(currentPeriod.month)} {currentPeriod.year + 543}
            </span>
          </p>
        </div>
        <Link href="/bills" className="button">
          <Icon name="bill" />
          จัดการบิล
        </Link>
      </header>
      <ApiNotice loading={loading} error={error} />
      {!loading && !selectedBranch && (
        <section className="empty-state">
          ยังไม่มีสาขา ให้เริ่มจากเมนู “ร้านและสาขา”
        </section>
      )}
      {!loading && !error && selectedBranch && rooms.length === 0 && (
        <section className="setup-welcome">
          <div className="setup-intro">
            <span className="setup-icon">
              <Icon name="building" />
            </span>
            <p className="setup-label">เริ่มต้นที่ห้องแรก</p>
            <h2>เริ่มตั้งค่าหอพัก</h2>
            <p>เพิ่มห้องพักและผู้เช่าเพื่อเริ่มออกบิล</p>
            <Link href="/rooms" className="button">
              เพิ่มห้องพัก <span aria-hidden="true">＋</span>
            </Link>
            <span className="setup-note">
              เมื่อมีข้อมูล สรุปและกราฟจะแสดงที่นี่โดยอัตโนมัติ
            </span>
          </div>
          <div className="setup-guide">
            <h3>เตรียมหอพักให้พร้อมใช้งาน</h3>
            {[
              {
                n: "01",
                title: "เพิ่มอาคารและห้องพัก",
                description: "กำหนดเลขห้อง ค่าเช่า และสถานะห้อง",
                href: "/rooms",
                icon: "building",
              },
              {
                n: "02",
                title: "เพิ่มข้อมูลผู้เช่า",
                description: "เชื่อมผู้เช่ากับห้องและจัดการสัญญา",
                href: "/residents",
                icon: "people",
              },
              {
                n: "03",
                title: "ออกใบแจ้งหนี้แรก",
                description: "รวมค่าเช่า ค่าน้ำ และค่าไฟในบิลเดียว",
                href: "/bills",
                icon: "bill",
              },
            ].map((step) => (
              <Link href={step.href} key={step.n} className="setup-step">
                <span className="step-number">{step.n}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
                <span className="step-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
            <div className="setup-help">
              <Icon name="settings" />
              <div>
                <strong>รับชำระผ่าน PromptPay</strong>
                <p>ตั้งค่าบัญชีรับเงินเพื่อให้ผู้เช่าชำระได้สะดวก</p>
              </div>
              <Link href="/settings">ตั้งค่า</Link>
            </div>
          </div>
        </section>
      )}
      {selectedBranch && !loading && !error && (
        <>
          <section className="work-actions" aria-label="งานที่ต้องทำ">
            <div className="work-actions-title">
              <Icon name="dashboard" />
              <span>งานที่รอทำ</span>
            </div>
            {[
              {
                count: tasks.pending,
                label: "สลิปรอตรวจ",
                href: "/payments",
                icon: "payment",
              },
              {
                count: tasks.overdue,
                label: "บิลเกินกำหนด",
                href: "/calendar",
                icon: "bill",
              },
              {
                count: tasks.missing,
                label: "ห้องรอสร้างบิล",
                href: "/bills",
                icon: "room",
              },
              {
                count: tasks.drafts,
                label: "บิลร่าง",
                href: "/bills?view=done",
                icon: "bill",
              },
            ].map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className={task.count ? "has-work" : ""}
              >
                <Icon name={task.icon} />
                <span>{task.label}</span>
                <b>{task.count}</b>
              </Link>
            ))}
          </section>
          <CollectionOverview invoices={invoices.data} />
          <div className="dashboard-grid">
            <section className="panel trend-panel">
              <div className="panel-head">
                <div>
                  <h2>แนวโน้มการชำระเงิน</h2>
                  <p>ยอดตามรอบบิล ย้อนหลัง 6 เดือน</p>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot billed" />
                    เรียกเก็บ
                  </span>
                  <span>
                    <i className="legend-dot received" />
                    รับแล้ว
                  </span>
                </div>
              </div>
              {trend.some((item) => item.billed > 0) ? (
                <div className="revenue-chart">
                  <div className="chart-scale" aria-hidden="true">
                    {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                      <span key={ratio}>
                        {new Intl.NumberFormat("th-TH", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(trendMax * ratio)}
                      </span>
                    ))}
                  </div>
                  <div
                    className="trend-chart"
                    role="img"
                    aria-label="ยอดเรียกเก็บสีส้มและยอดรับชำระสีเขียว ย้อนหลัง 6 เดือน ดูยอดละเอียดในตารางใต้กราฟ"
                  >
                    {trend.map((item, index) => (
                      <div className="trend-column" key={index}>
                        <div className="trend-bars">
                          <i
                            className="bar billed"
                            style={{
                              height: `${(item.billed / trendMax) * 100}%`,
                            }}
                          />
                          <i
                            className="bar received"
                            style={{
                              height: `${(item.received / trendMax) * 100}%`,
                            }}
                          />
                        </div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chart-empty">
                  <div className="empty-chart-grid" aria-hidden="true">
                    <span>0 บาท</span>
                    <div className="empty-chart-baseline" />
                    {trend.map((item, index) => (
                      <small key={index}>{item.label}</small>
                    ))}
                  </div>
                  <h3>ยังไม่มีรายการเรียกเก็บ</h3>
                  <p>กราฟจะแสดงยอดจริงเมื่อเริ่มออกใบแจ้งหนี้</p>
                  <Link href="/bills">ไปที่ใบแจ้งหนี้ ↗</Link>
                </div>
              )}
              <details className="chart-details">
                <summary>ดูยอดเงินรายเดือน</summary>
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">
                      ยอดเงินย้อนหลัง 6 เดือน หน่วยบาท
                    </caption>
                    <thead>
                      <tr>
                        <th>เดือน</th>
                        <th>เรียกเก็บ</th>
                        <th>รับชำระแล้ว</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((item, index) => (
                        <tr key={index}>
                          <td>{item.label}</td>
                          <td>{money(item.billed)}</td>
                          <td>{money(item.received)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <section className="panel occupancy-panel">
              <div className="panel-head">
                <div>
                  <h2>สถานะห้องพัก</h2>
                  <p>
                    {stats.occupied} จาก {rooms.length} ห้องมีผู้เช่า
                  </p>
                </div>
              </div>
              {rooms.length ? (
                <div className="occupancy-content">
                  <div
                    className="occupancy-ring"
                    style={{
                      background: `conic-gradient(${[
                        "OCCUPIED",
                        "VACANT",
                        "RESERVED",
                        "MAINTENANCE",
                      ]
                        .map((status, index, all) => {
                          const before =
                            (all
                              .slice(0, index)
                              .reduce(
                                (n, key) =>
                                  n +
                                  rooms.filter((r) => r.status === key).length,
                                0,
                              ) /
                              rooms.length) *
                            100;
                          const after =
                            before +
                            (rooms.filter((r) => r.status === status).length /
                              rooms.length) *
                              100;
                          return `var(--room-${status.toLowerCase()}) ${before}% ${after}%`;
                        })
                        .join(",")})`,
                    }}
                  >
                    <div>
                      <strong>{stats.occupied}</strong>
                      <span>ห้องมีผู้เช่า</span>
                    </div>
                  </div>
                  <div className="occupancy-legend">
                    {Object.entries(roomLabel).map(([status, label]) => (
                      <div key={status}>
                        <span>
                          <i
                            style={{
                              background: `var(--room-${status.toLowerCase()})`,
                            }}
                          />
                          {label}
                        </span>
                        <b>
                          {
                            rooms.filter((room) => room.status === status)
                              .length
                          }{" "}
                          ห้อง
                        </b>
                      </div>
                    ))}
                  </div>
                  <Link href="/rooms" className="text-link occupancy-link">
                    จัดการห้องพัก
                  </Link>
                </div>
              ) : (
                <div className="occupancy-empty">
                  <div className="occupancy-ring empty-ring">
                    <div>
                      <strong>0</strong>
                      <span>ห้องพักทั้งหมด</span>
                    </div>
                  </div>
                  <p>ยังไม่มีข้อมูลห้องพัก</p>
                  <Link href="/rooms">เพิ่มห้องพัก ↗</Link>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
