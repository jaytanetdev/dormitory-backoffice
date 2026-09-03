"use client";

import { useEffect, useRef, useState } from "react";

export type CheckboxOption = { value: string; label: string };

type MultiCheckboxDropdownProps = {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: CheckboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiCheckboxDropdown({ value, onValueChange, options, placeholder = "เลือกสถานะ", disabled, className = "" }: MultiCheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(event: MouseEvent) { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const selected = options.filter((option) => value.includes(option.value));
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].label : `เลือกแล้ว ${selected.length} รายการ`;
  function toggle(optionValue: string) { onValueChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]); }
  return <div className={`multi-select ${className}`} ref={rootRef}>
    <button type="button" className="multi-select-trigger" onClick={() => setOpen((current) => !current)} disabled={disabled} aria-expanded={open} aria-haspopup="listbox"><span>{label}</span><span className="multi-select-chevron">⌄</span></button>
    {open && <div className="multi-select-content" role="listbox" aria-multiselectable="true">
      <button type="button" className="multi-select-clear" onClick={() => onValueChange([])} disabled={!value.length}>ล้างตัวกรอง</button>
      {options.map((option) => <label className="multi-select-item" key={option.value}><input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} /><span className="multi-select-check">✓</span><span>{option.label}</span></label>)}
    </div>}
  </div>;
}
