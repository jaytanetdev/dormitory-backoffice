"use client";

import { useEffect, useState } from "react";
import { ApiNotice } from "@/components/api-notice";
import { PageHead } from "@/components/page-head";
import { Select } from "@/components/ui/select";
import { Status } from "@/components/status";
import { apiMutation } from "@/lib/api";
import type { RoleDto, UserDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";

const emptyUsers: UserDto[] = [];
const emptyRoles: RoleDto[] = [];

export default function Users() {
  const users = useApiQuery<UserDto[]>("/users", emptyUsers);
  const roles = useApiQuery<RoleDto[]>("/roles", emptyRoles);
  const [items, setItems] = useState<UserDto[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleId, setRoleId] = useState("");

  useEffect(() => setItems(users.data), [users.data]);
  useEffect(() => { if (!roleId && roles.data[0]) setRoleId(roles.data[0].id); }, [roles.data, roleId]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const role = roles.data.find((item) => item.id === roleId);
    const result = await apiMutation<UserDto>("/users", { displayName: String(form.get("displayName")), email: String(form.get("email")), password: String(form.get("password")), roleId, allBranches: true, branchIds: [] });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setItems((current) => [...current, { ...result.data, role: role || { id: roleId, name: "ผู้ใช้งาน" }, branches: [], allBranches: true, status: "ACTIVE" } as UserDto]);
    setOpen(false);
  }

  return <>
    <PageHead title="ผู้ใช้งาน" subtitle="สร้างบัญชี เลือกบทบาท และจัดการสมาชิกทีม" />
    <ApiNotice loading={users.loading || roles.loading} error={users.error || roles.error || error} />
    <div className="page-head-actions"><button type="button" className="button" onClick={() => setOpen(true)}>＋ เชิญผู้ใช้งาน</button></div>
    {open && <div className="modal-backdrop" onMouseDown={() => !busy && setOpen(false)}><section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">เพิ่มสมาชิกทีม</div><h2>เชิญผู้ใช้งาน</h2></div><button type="button" className="icon-button" onClick={() => setOpen(false)} disabled={busy}>×</button></div><form onSubmit={invite}><label className="field"><span>ชื่อที่แสดง</span><input name="displayName" required disabled={busy} /></label><label className="field"><span>อีเมล</span><input name="email" type="email" required disabled={busy} /></label><label className="field"><span>รหัสผ่านเริ่มต้น</span><input name="password" type="password" minLength={8} required disabled={busy} /></label><label className="field"><span>บทบาท</span><Select name="roleId" value={roleId} onValueChange={setRoleId} disabled={busy || !roles.data.length} placeholder="เลือกบทบาท" options={roles.data.map((role) => ({ value: role.id, label: role.name }))} /></label><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setOpen(false)} disabled={busy}>ยกเลิก</button><button className="button" disabled={busy || !roleId}>{busy ? "กำลังสร้าง…" : "สร้างผู้ใช้งาน"}</button></div></form></section></div>}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สาขา</th><th>สถานะ</th></tr></thead><tbody>{items.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong></td><td>{user.email}</td><td>{user.role.name}</td><td>{user.allBranches ? "ทุกสาขา" : user.branches.map((branch) => branch.branch.name).join(", ") || "—"}</td><td><Status>{user.status === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}</Status></td></tr>)}</tbody></table></div>
  </>;
}
