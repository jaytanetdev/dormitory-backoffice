const statusClass = (label: string) => {
  if (label.includes("บางส่วน")) return "partial";
  if (/เกินกำหนด|ปฏิเสธ|ยกเลิก|พักบัญชี/.test(label)) return "overdue";
  if (/รอ|จอง/.test(label)) return "pending";
  if (
    /ชำระแล้ว|อนุมัติ|มีผู้เช่า|กำลังเช่า|เชื่อมแล้ว/.test(label) ||
    label === "ใช้งาน"
  )
    return "paid";
  return "";
};

export function Status({ children }: { children: string }) {
  return <span className={"status " + statusClass(children)}>{children}</span>;
}
