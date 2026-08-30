"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import { ApiNotice } from "@/components/api-notice";
import { useApiQuery } from "@/lib/use-api";
import { apiMutation } from "@/lib/api";
import type { PermissionGroupDto, RoleDto } from "@/lib/api-types";

const actionLabels: Record<string, string> = { view: "ดู", create: "สร้าง", update: "แก้ไข", delete: "ลบ", approve: "อนุมัติ", export: "ส่งออก", issue: "ออกบิล", invite: "ส่งลิงก์" };
const moduleLabels: Record<string, string> = { dashboard: "แดชบอร์ด", branch: "ร้านและสาขา", property: "อาคาร / โครงการ", room: "ห้องพัก", resident: "ผู้เช่า", contract: "สัญญาเช่า", meter: "มิเตอร์น้ำ / ไฟ", invoice: "ใบแจ้งหนี้", payment: "การชำระเงิน", user: "ผู้ใช้งาน", role: "บทบาทและสิทธิ์", settings: "ตั้งค่าระบบ", notification: "การแจ้งเตือน" };
const permissions: PermissionGroupDto[] = ["dashboard", "branch", "room", "resident", "invoice", "payment", "user", "role", "settings"].map((module) => ({ module, actions: ["view", "create", "update", "delete", "approve", "export"].map((action) => ({ key: `${module}.${action}`, action, description: null })) }));
const roles: RoleDto[] = [{ id: "role-manager", name: "ผู้จัดการสาขา", description: "จัดการงานประจำสาขา", permissions: [{ permission: { key: "dashboard.view" } }, { permission: { key: "room.view" } }, { permission: { key: "resident.view" } }], _count: { users: 2 } }];

export default function Roles() {
  const roleQuery = useApiQuery("/roles", roles); const permissionQuery = useApiQuery("/permissions", permissions);
  const [items, setItems] = useState<RoleDto[]>([]); const [selected, setSelected] = useState(roles[0].id); const [checks, setChecks] = useState<Set<string>>(new Set()); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  useEffect(() => setItems(roleQuery.data), [roleQuery.data]);
  const role = items.find((item) => item.id === selected) || items[0];
  useEffect(() => { if (role) setChecks(new Set(role.permissions.map((item) => item.permission.key))); }, [role]);
  function toggle(key: string) { setChecks((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  function toggleGroup(group: PermissionGroupDto) { setChecks((current) => { const next = new Set(current); const allSelected = group.actions.every((action) => next.has(action.key)); group.actions.forEach((action) => allSelected ? next.delete(action.key) : next.add(action.key)); return next; }); }
  async function save() { if (!role) return; setSaving(true); setError(null); setSaved(false); const result = await apiMutation<RoleDto>(`/roles/${role.id}/permissions`, { permissionKeys: Array.from(checks) }, "PATCH"); setSaving(false); if (!result.ok) { setError(result.message); return; } setItems((current) => current.map((item) => item.id === role.id ? { ...item, ...result.data, _count: item._count } : item)); setSaved(true); }
  async function createRole(values: { name: string; details: string }) { const result = await apiMutation<RoleDto>("/roles", { name: values.name, description: values.details || undefined, permissionKeys: [] }); if (!result.ok) { setError(result.message); return false; } setItems((current) => [...current, result.data]); setSelected(result.data.id); setError(null); return true; }
  return <><PageHead title="บทบาทและสิทธิ์" subtitle="กำหนดสิทธิ์เป็นกลุ่มเมนู อ่านง่าย และควบคุมได้ละเอียด" action="สร้างบทบาท" onAction={createRole} /><ApiNotice loading={roleQuery.loading || permissionQuery.loading} error={roleQuery.error || permissionQuery.error || error} />
    <div className="role-editor role-editor-modern"><aside className="role-list" aria-label="รายการบทบาท"><div className="role-list-label">บทบาททั้งหมด</div>{items.map((item) => <button type="button" onClick={() => setSelected(item.id)} className={`role-option ${item.id === role?.id ? "active" : ""}`} key={item.id}><strong>{item.name}</strong><small>{item._count?.users || 0} ผู้ใช้งาน</small><span className="role-chevron">›</span></button>)}</aside>
      <section className="permission-wrap permission-modern"><div className="permission-intro"><div><div className="eyebrow">กำลังแก้ไขบทบาท</div><h2>{role?.name || "ยังไม่มีบทบาท"}</h2><p className="subtitle">{role?.isSystem ? "บทบาทระบบไม่อนุญาตให้แก้ไข กรุณาสร้างบทบาทใหม่" : role?.description || "เลือกสิทธิ์ที่บทบาทนี้ใช้งานได้"}</p></div><div className="permission-actions"><span className="permission-count">เลือกแล้ว {checks.size} สิทธิ์</span><button type="button" className="button secondary" disabled={role?.isSystem} onClick={() => setChecks(new Set())}>ล้างทั้งหมด</button><button type="button" className="button" disabled={!role || role.isSystem || saving} onClick={save}>{saving ? "กำลังบันทึก…" : role?.isSystem ? "บทบาทระบบ" : "บันทึกสิทธิ์"}</button>{saved && <span className="saved-label" role="status">บันทึกแล้ว</span>}</div></div>
        <div className="permission-cards">{permissionQuery.data.map((group) => { const selectedCount = group.actions.filter((a) => checks.has(a.key)).length; const allSelected = selectedCount === group.actions.length; return <article className="permission-card" key={group.module}><div className="permission-card-head"><div><h3>{moduleLabels[group.module] || group.module}</h3><p>กำหนดการเข้าถึงเมนูนี้</p></div><div className="permission-card-tools"><span>{selectedCount}/{group.actions.length}</span><button type="button" className="select-all" onClick={() => toggleGroup(group)}>{allSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</button></div></div><div className="permission-options">{group.actions.map((permission) => <label className={`permission-option ${checks.has(permission.key) ? "checked" : ""}`} key={permission.key}><input type="checkbox" checked={checks.has(permission.key)} onChange={() => toggle(permission.key)} /><span className="permission-check">✓</span><span>{actionLabels[permission.action] || permission.action}</span></label>)}</div></article>; })}</div>
      </section>
    </div></>;
}
