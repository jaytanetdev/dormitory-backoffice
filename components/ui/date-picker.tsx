"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};
const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parse = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
};

export function DatePicker({
  value,
  defaultValue = "",
  onValueChange,
  name,
  required,
  disabled,
  className = "",
}: DatePickerProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const selected = current ? parse(current) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected || new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      )
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        rootRef.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);
  useEffect(() => {
    if (current) setMonth(parse(current));
  }, [current]);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = rootRef.current?.getBoundingClientRect();
      const popup = popupRef.current?.getBoundingClientRect();
      if (!anchor || !popup) return;
      const margin = 8,
        gap = 6;
      const below = window.innerHeight - anchor.bottom - margin;
      const above = anchor.top - margin;
      const top =
        below >= popup.height || below >= above
          ? anchor.bottom + gap
          : anchor.top - popup.height - gap;
      setPosition({
        top: Math.max(
          margin,
          Math.min(top, window.innerHeight - popup.height - margin),
        ),
        left: Math.max(
          margin,
          Math.min(anchor.left, window.innerWidth - popup.width - margin),
        ),
      });
    }
    place();
    const observer = new ResizeObserver(place);
    if (popupRef.current) observer.observe(popupRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, month]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from(
    {
      length:
        ((first.getDay() + 6) % 7) +
        new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    },
    (_, index) => index - ((first.getDay() + 6) % 7) + 1,
  );
  function choose(day: number) {
    const next = toKey(new Date(month.getFullYear(), month.getMonth(), day));
    if (!controlled) setInternal(next);
    onValueChange?.(next);
    setOpen(false);
    rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }
  return (
    <div className={`date-picker ${className}`} ref={rootRef}>
      {name && (
        <input type="hidden" name={name} value={current} required={required} />
      )}
      <button
        type="button"
        className="date-picker-trigger"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popupId : undefined}
      >
        {current
          ? new Date(`${current}T12:00:00`).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "เลือกวันที่"}
        <span>▣</span>
      </button>
      {open &&
        createPortal(
          <div
            className="date-picker-content"
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label="เลือกวันที่"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 1000,
              maxHeight: "calc(100dvh - 16px)",
              overflowY: "auto",
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="date-picker-head">
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                ‹
              </button>
              <strong>
                {new Intl.DateTimeFormat("th-TH", {
                  month: "long",
                  year: "numeric",
                }).format(month)}
              </strong>
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                ›
              </button>
            </div>
            <div className="date-picker-week">
              {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="date-picker-grid">
              {days.map((day, index) =>
                day < 1 ||
                day >
                  new Date(
                    month.getFullYear(),
                    month.getMonth() + 1,
                    0,
                  ).getDate() ? (
                  <span className="date-picker-empty" key={index} />
                ) : (
                  <button
                    type="button"
                    className={
                      selected &&
                      selected.getFullYear() === month.getFullYear() &&
                      selected.getMonth() === month.getMonth() &&
                      selected.getDate() === day
                        ? "selected"
                        : ""
                    }
                    onClick={() => choose(day)}
                    key={index}
                  >
                    {day}
                  </button>
                ),
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
