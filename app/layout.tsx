import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ห้องบัญชี — ระบบจัดการหอพัก", description: "Backoffice สำหรับร้าน สาขา ห้อง บิล และผู้เช่า" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
