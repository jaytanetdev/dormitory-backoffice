"use client";

import { useState } from "react";

export function ActionButton({ label, variant = "secondary", message = "เปิดการทำงานรายการนี้แล้ว" }: { label: string; variant?: "primary" | "secondary"; message?: string }) {
  const [notice, setNotice] = useState(false);
  return <span className="action-button-wrap"><button type="button" className={`button ${variant === "secondary" ? "secondary" : ""}`} onClick={() => { setNotice(true); window.setTimeout(() => setNotice(false), 1800); }}>{label}</button>{notice && <span className="action-toast" role="status">✓ {message}</span>}</span>;
}
