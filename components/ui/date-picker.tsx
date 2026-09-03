"use client";

import { useEffect, useRef, useState } from "react";

type DatePickerProps = { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; name?: string; required?: boolean; disabled?: boolean; className?: string };
const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (value: string) => { const [year, month, day] = value.split("-").map(Number); return year && month && day ? new Date(year, month - 1, day) : new Date(); };

export function DatePicker({ value, defaultValue = "", onValueChange, name, required, disabled, className = "" }: DatePickerProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const selected = current ? parse(current) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected || new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { function close(event: MouseEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); } document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  useEffect(() => { if (selected) setMonth(selected); }, [current]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from({ length: (first.getDay() + 6) % 7 + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index - ((first.getDay() + 6) % 7) + 1);
  function choose(day: number) { const next = toKey(new Date(month.getFullYear(), month.getMonth(), day)); if (!controlled) setInternal(next); onValueChange?.(next); setOpen(false); }
  return <div className={`date-picker ${className}`} ref={rootRef}>{name && <input type="hidden" name={name} value={current} required={required} />}<button type="button" className="date-picker-trigger" onClick={() => setOpen((currentOpen) => !currentOpen)} disabled={disabled} aria-expanded={open}>{current ? new Date(`${current}T12:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "เลือกวันที่"}<span>▣</span></button>{open && <div className="date-picker-content"><div className="date-picker-head"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(month)}</strong><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div><div className="date-picker-week">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => <span key={day}>{day}</span>)}</div><div className="date-picker-grid">{days.map((day, index) => day < 1 || day > new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() ? <span className="date-picker-empty" key={index} /> : <button type="button" className={selected && selected.getFullYear() === month.getFullYear() && selected.getMonth() === month.getMonth() && selected.getDate() === day ? "selected" : ""} onClick={() => choose(day)} key={index}>{day}</button>)}</div></div>}</div>;
}
