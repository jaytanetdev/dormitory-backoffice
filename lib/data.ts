export type RoomStatus = "occupied" | "vacant" | "overdue" | "maintenance";
export interface Room { id: string; floor: number; type: string; resident?: string; status: RoomStatus; amount?: number }

export const rooms: Room[] = [
  { id: "401", floor: 4, type: "ห้องปูน · แอร์", status: "vacant" },
  { id: "402", floor: 4, type: "ห้องปูน · แอร์", resident: "ณัฐวุฒิ", status: "occupied", amount: 4380 },
  { id: "403", floor: 4, type: "ห้องไม้ · พัดลม", resident: "กมลชนก", status: "occupied", amount: 3220 },
  { id: "404", floor: 4, type: "ห้องปูน · แอร์", status: "maintenance" },
  { id: "301", floor: 3, type: "ห้องปูน · แอร์", resident: "พิมพ์ชนก", status: "overdue", amount: 5120 },
  { id: "302", floor: 3, type: "ห้องปูน · พัดลม", resident: "วรากร", status: "occupied", amount: 3690 },
  { id: "303", floor: 3, type: "ห้องปูน · แอร์", resident: "ศุภชัย", status: "occupied", amount: 4150 },
  { id: "304", floor: 3, type: "ห้องไม้ · พัดลม", status: "vacant" },
  { id: "201", floor: 2, type: "ห้องปูน · แอร์", resident: "ชลธิชา", status: "occupied", amount: 4290 },
  { id: "202", floor: 2, type: "ห้องปูน · แอร์", resident: "ชนาธิป", status: "overdue", amount: 4780 },
  { id: "203", floor: 2, type: "ห้องไม้ · พัดลม", resident: "นฤมล", status: "occupied", amount: 3410 },
  { id: "204", floor: 2, type: "ห้องปูน · แอร์", resident: "พิชญา", status: "occupied", amount: 4020 },
];

export const bills = [
  { no: "INV-6908-104", room: "402", resident: "ณัฐวุฒิ ทองดี", rent: 3500, water: 180, electric: 700, total: 4380, status: "รอชำระ" },
  { no: "INV-6908-103", room: "301", resident: "พิมพ์ชนก ชูใจ", rent: 3800, water: 240, electric: 1080, total: 5120, status: "เกินกำหนด" },
  { no: "INV-6908-102", room: "203", resident: "นฤมล แก้วคำ", rent: 2800, water: 160, electric: 450, total: 3410, status: "ชำระแล้ว" },
  { no: "INV-6908-101", room: "202", resident: "ชนาธิป นาคิน", rent: 3500, water: 180, electric: 1100, total: 4780, status: "รอตรวจสลิป" },
];

export const residents = [
  { name: "ณัฐวุฒิ ทองดี", room: "402", phone: "081-234-8890", line: true, since: "1 มิ.ย. 2568" },
  { name: "พิมพ์ชนก ชูใจ", room: "301", phone: "094-562-1103", line: true, since: "14 ม.ค. 2569" },
  { name: "ชนาธิป นาคิน", room: "202", phone: "098-442-7865", line: false, since: "20 พ.ค. 2569" },
  { name: "นฤมล แก้วคำ", room: "203", phone: "065-911-2780", line: true, since: "1 ก.ค. 2567" },
];
