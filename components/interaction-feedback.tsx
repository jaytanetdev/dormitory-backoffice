"use client";

import { useEffect, useState } from "react";

function filterRows(source: HTMLInputElement | HTMLSelectElement) {
  const root = source.closest(".content") ?? document;
  const rows = Array.from(root.querySelectorAll(".data-table tbody tr")) as HTMLElement[];
  if (!rows.length) return;
  const query = source instanceof HTMLSelectElement && source.options[source.selectedIndex]?.text.includes("ทุกสถานะ") ? "" : source.value.trim().toLowerCase();
  rows.forEach((row) => { row.style.display = !query || row.textContent?.toLowerCase().includes(query) ? "" : "none"; });
}

function exportTable(button: HTMLButtonElement) {
  const table = button.closest(".content")?.querySelector(".data-table") as HTMLTableElement | null;
  if (!table) return false;
  const rows = Array.from(table.querySelectorAll("tr"));
  const csv = rows.map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => `"${(cell.textContent ?? "").trim().replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `dormitory-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); return true;
}

export function InteractionFeedback() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: number | undefined;
    const notify = (text: string) => { setMessage(text); window.clearTimeout(timer); timer = window.setTimeout(() => setMessage(""), 1800); };
    const onInput = (event: Event) => { const source = event.target as HTMLInputElement | HTMLSelectElement; if (source.matches(".search")) filterRows(source); if (source.matches(".filter") && source instanceof HTMLSelectElement && Array.from(source.options).some((option) => /สถานะ|ห้องว่าง|มีผู้เช่า/.test(option.text))) filterRows(source); };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest("button") as HTMLButtonElement | null;
      if (!button || button.disabled || button.dataset.feedback === "off") return;
      const label = button.textContent?.trim() || "รายการ";
      if (label.includes("ส่งออก")) { if (exportTable(button)) notify("ส่งออกไฟล์ CSV เรียบร้อยแล้ว"); else notify("หน้านี้ยังไม่มีตารางสำหรับส่งออก"); return; }
      if (label.includes("ดูรายงาน")) { window.location.href = "/bills"; return; }
      notify(`เลือก “${label}” แล้ว`);
    };
    document.addEventListener("input", onInput); document.addEventListener("change", onInput); document.addEventListener("click", onClick);
    return () => { document.removeEventListener("input", onInput); document.removeEventListener("change", onInput); document.removeEventListener("click", onClick); window.clearTimeout(timer); };
  }, []);
  return message ? <div className="global-toast" role="status">✓ {message}</div> : null;
}
