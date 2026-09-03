"use client";

import * as SelectPrimitive from "@radix-ui/react-select";

export type SelectOption = { value: string; label: string };
type SelectProps = { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; options: SelectOption[]; placeholder?: string; disabled?: boolean; name?: string; className?: string };

export function Select({ value, defaultValue, onValueChange, options, placeholder = "เลือกข้อมูล", disabled, name, className = "" }: SelectProps) {
  return <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
    {name && <input type="hidden" name={name} value={value ?? ""} />}
    <SelectPrimitive.Trigger className={`select-trigger ${className}`} aria-label={placeholder}><SelectPrimitive.Value placeholder={placeholder} /><SelectPrimitive.Icon className="select-chevron" aria-hidden="true" /></SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content className="select-content" position="popper" sideOffset={6}><SelectPrimitive.Viewport>{options.map((option) => <SelectPrimitive.Item className="select-item" value={option.value} key={option.value}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className="select-item-indicator">✓</SelectPrimitive.ItemIndicator></SelectPrimitive.Item>)}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
