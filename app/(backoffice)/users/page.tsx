"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiNotice } from "@/components/api-notice";
import { TableIdentity } from "@/components/table-identity";
import { Status } from "@/components/status";
import { PageHead } from "@/components/page-head";
import { Select } from "@/components/ui/select";
import { useBranch } from "@/components/branch-context";
import { apiMutation } from "@/lib/api";
import type { RoleDto, UserDto } from "@/lib/api-types";
import { useApiQuery } from "@/lib/use-api";
const emptyUsers: UserDto[] = [];
const emptyRoles: RoleDto[] = [];
export default function Users() {
  const users = useApiQuery("/users", emptyUsers);
  const roles = useApiQuery("/users/assignable-roles", emptyRoles);
  const me = useApiQuery<{
    id: string;
    permissions: string[];
    allBranches: boolean;
    branchIds: string[];
  }>("/auth/me", {
    id: "",
    permissions: [],
    allBranches: false,
    branchIds: [],
  });
  const { branches } = useBranch();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [roleId, setRoleId] = useState("");
  const [allBranches, setAllBranches] = useState(false);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [status, setStatus] = useState("ACTIVE");
  const canCreate = me.data.permissions.includes("user.create");
  const canUpdate = me.data.permissions.includes("user.update");
  const visible = users.data.filter(
    (user) =>
      (filter === "ALL" || user.status === filter) &&
      (user.displayName + " " + user.email + " " + user.role.name)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function edit(user?: UserDto) {
    setEditing(user);
    setRoleId(user?.role.id ?? roles.data[0]?.id ?? "");
    setAllBranches(user?.allBranches ?? false);
    setBranchIds(user?.branches.map((item) => item.branch.id) ?? []);
    setStatus(user?.status ?? "ACTIVE");
    setError(undefined);
    setOpen(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const payload = {
      displayName: String(form.get("displayName")).trim(),
      roleId,
      allBranches,
      branchIds: allBranches ? [] : branchIds,
      ...(editing
        ? { status }
        : {
            email: String(form.get("email")),
            password: String(form.get("password")),
          }),
    };
    const result = await apiMutation<UserDto>(
      editing ? "/users/" + editing.id : "/users",
      payload,
      editing ? "PATCH" : "POST",
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await cache.invalidateQueries({ queryKey: ["api", "/users"] });
    setOpen(false);
  }
  return (
    <>
      <PageHead
        title="สมาชิกทีม"
        subtitle="ค้นหาสมาชิก เลือกบทบาท และกำหนดสาขาที่ดูแล"
      />
      <ApiNotice
        loading={users.loading || roles.loading || me.loading}
        error={users.error || roles.error || me.error || error || null}
      />
      <div className="team-summary">
        <span>
          สมาชิกทั้งหมด <b>{users.data.length}</b>
        </span>
        <span>
          ใช้งาน{" "}
          <b>{users.data.filter((user) => user.status === "ACTIVE").length}</b>
        </span>
        <span>
          พักบัญชี{" "}
          <b>
            {users.data.filter((user) => user.status === "SUSPENDED").length}
          </b>
        </span>
      </div>
      <div className="toolbar">
        <input
          className="search"
          aria-label="ค้นหาสมาชิกทีม"
          placeholder="ค้นหาชื่อ อีเมล หรือบทบาท"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          className="filter"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "ALL", label: "ทุกสถานะ" },
            { value: "ACTIVE", label: "ใช้งาน" },
            { value: "SUSPENDED", label: "พักบัญชี" },
            { value: "INVITED", label: "รอเปิดใช้งาน" },
          ]}
        />
        {canCreate && (
          <button className="button" onClick={() => edit()}>
            ＋ เพิ่มสมาชิกทีม
          </button>
        )}
      </div>
      <div
        className="table-wrap"
        role="region"
        aria-label="ตารางสมาชิกทีม"
        tabIndex={0}
      >
        <p className="table-scroll-hint">เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>สมาชิก</th>
              <th>บทบาท</th>
              <th>สาขาที่ดูแล</th>
              <th>สถานะ</th>
              <th className="table-actions-cell">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id}>
                <td>
                  <TableIdentity
                    label={user.displayName}
                    description={user.email}
                    badge={user.displayName.trim().slice(0, 2) || "?"}
                    avatar
                  />
                </td>
                <td>
                  <span className="table-role">{user.role.name}</span>
                  <small className="team-email">
                    {user.role.isSystem ? "บัญชีระบบ" : "สมาชิกทีม"}
                  </small>
                </td>
                <td>
                  {user.allBranches
                    ? "ทุกสาขา"
                    : user.branches
                        .map((item) => item.branch.name)
                        .join(", ") || "ยังไม่เลือกสาขา"}
                </td>
                <td>
                  <Status>
                    {user.status === "ACTIVE"
                      ? "ใช้งาน"
                      : user.status === "SUSPENDED"
                        ? "พักบัญชี"
                        : "รอเปิดใช้งาน"}
                  </Status>
                </td>
                <td className="table-actions-cell">
                  {canUpdate && user.canManage && (
                    <button
                      className="button secondary"
                      onClick={() => edit(user)}
                    >
                      แก้ไข
                    </button>
                  )}
                  {user.id === me.data.id && (
                    <span className="muted">บัญชีของคุณ</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && !users.loading && (
          <p className="empty-state">ไม่พบสมาชิกที่ตรงกับการค้นหา</p>
        )}
      </div>
      <details className="team-role-help">
        <summary>แต่ละบทบาททำอะไรได้บ้าง</summary>
        <section className="role-guide">
          {roles.data.map((role) => (
            <article key={role.id}>
              <strong>{role.name}</strong>
              <p>{role.description || "สิทธิ์ตามที่ผู้ดูแลระบบกำหนด"}</p>
            </article>
          ))}
          {!roles.loading && !roles.error && !roles.data.length && (
            <p>
              ยังไม่มีบทบาทที่คุณมอบหมายได้ ให้ Platform Admin
              สร้างบทบาทของทีมก่อน
            </p>
          )}
        </section>
      </details>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !busy && setOpen(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "แก้ไขสมาชิกทีม" : "เพิ่มสมาชิกทีม"}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h2>{editing ? "แก้ไขสมาชิกทีม" : "เพิ่มสมาชิกทีม"}</h2>
              <button
                className="icon-button"
                aria-label="ปิด"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <label className="field">
                <span>ชื่อสมาชิก</span>
                <input
                  name="displayName"
                  defaultValue={editing?.displayName}
                  required
                  disabled={busy}
                />
              </label>
              {!editing && (
                <>
                  <label className="field">
                    <span>อีเมลเข้าสู่ระบบ</span>
                    <input name="email" type="email" required disabled={busy} />
                  </label>
                  <label className="field">
                    <span>รหัสผ่านเริ่มต้น</span>
                    <input
                      name="password"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>บทบาท</span>
                <Select
                  value={roleId}
                  onValueChange={setRoleId}
                  disabled={busy}
                  placeholder="เลือกบทบาท"
                  options={roles.data.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                />
              </label>
              <p className="help">
                {roles.data.find((role) => role.id === roleId)?.description}
              </p>
              <fieldset className="team-branches" disabled={busy}>
                <legend>สาขาที่ดูแล</legend>
                {me.data.allBranches && (
                  <label>
                    <input
                      type="checkbox"
                      checked={allBranches}
                      onChange={(event) => setAllBranches(event.target.checked)}
                    />
                    ทุกสาขา
                  </label>
                )}
                {!allBranches &&
                  branches.map((branch) => (
                    <label key={branch.id}>
                      <input
                        type="checkbox"
                        checked={branchIds.includes(branch.id)}
                        onChange={(event) =>
                          setBranchIds((current) =>
                            event.target.checked
                              ? [...current, branch.id]
                              : current.filter((id) => id !== branch.id),
                          )
                        }
                      />
                      {branch.name}
                    </label>
                  ))}
              </fieldset>
              {editing && (
                <label className="field">
                  <span>สถานะบัญชี</span>
                  <Select
                    value={status}
                    onValueChange={setStatus}
                    options={[
                      { value: "ACTIVE", label: "ใช้งาน" },
                      { value: "SUSPENDED", label: "พักบัญชี" },
                      { value: "INVITED", label: "รอเปิดใช้งาน" },
                    ]}
                  />
                </label>
              )}
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="button"
                  disabled={
                    busy || !roleId || (!allBranches && !branchIds.length)
                  }
                >
                  {busy ? "กำลังบันทึก…" : "บันทึกสมาชิก"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
