/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful test fixtures intentionally model varying API response shapes. */
import { test as base, expect, type Page } from "@playwright/test";
import data from "./data.json";
const permissions = [
  ...new Set(
    data.roles.flatMap((r) => r.permissions.map((p) => p.permission.key)),
  ),
  "branch.create",
  "branch.update",
  "branch.delete",
  "role.view",
  "role.create",
  "role.update",
];
const branch = {
  id: "branch",
  name: "สาขาทดสอบ",
  code: "QA",
  claimCode: "qa-claim",
  lineIntegration: {
    liffId: "qa-liff",
    displayName: "QA LINE",
    isActive: true,
  },
};
export type State = {
  permissions: string[];
  platform: boolean;
  fail: string;
  requests: any[];
  invoices: any[];
  users: any[];
  payments: any[];
  residents: any[];
  properties: any[];
  setting: any;
};
export const test = base.extend<{ state: State }>({
  state: [
    async ({ page }, use) => {
      const invoices = structuredClone(data.invoices).map((i) => ({
        ...i,
        branchId: "branch",
        period: {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        },
      }));
      const state: State = {
        permissions: [...permissions],
        platform: false,
        fail: "",
        requests: [],
        invoices,
        setting: null,
        users: [
          {
            id: "owner",
            email: "owner@example.invalid",
            displayName: "เจ้าของทดสอบ",
            status: "ACTIVE",
            allBranches: true,
            canManage: false,
            role: { id: "owner-role", name: "Owner", isSystem: true },
            branches: [],
          },
          {
            id: "team",
            email: "team@example.invalid",
            displayName: "สมาชิกทดสอบ",
            status: "ACTIVE",
            allBranches: false,
            canManage: true,
            role: data.roles[0],
            branches: [{ branch }],
          },
        ],
        payments: [
          {
            id: "pending",
            amount: 5000,
            status: "PENDING",
            createdAt: "2026-09-06T10:00:00Z",
            paidAt: "2026-09-06T10:00:00Z",
            slip: {
              fileUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            },
            invoice: {
              room: { number: "102" },
              contract: { resident: { fullName: "นิดา ตัวอย่าง" } },
            },
          },
        ],
        residents: [
          {
            id: "resident",
            fullName: "ลูกบ้านทดสอบ",
            phone: "0812345678",
            lineIdentity: { lineUserId: "qa-line" },
            contracts: [
              {
                id: "contract",
                status: "ACTIVE",
                startDate: "2026-01-01",
                room: { id: "room-0", number: "101" },
              },
            ],
          },
        ],
        properties: [
          {
            id: "property",
            name: "หอทดสอบ",
            buildings: [
              {
                id: "building",
                name: "อาคาร A",
                rooms: [
                  ...invoices.map((i) => ({
                    ...i.room,
                    floor: "1",
                    status: "OCCUPIED",
                    monthlyRent: 5000,
                    roomType: {
                      id: "type",
                      name: "ห้องมาตรฐาน",
                      baseRent: 5000,
                    },
                  })),
                  {
                    id: "vacant",
                    number: "106",
                    floor: "1",
                    status: "VACANT",
                    monthlyRent: 5000,
                    roomType: {
                      id: "type",
                      name: "ห้องมาตรฐาน",
                      baseRent: 5000,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      await page.context().addCookies([
        {
          name: "dormitory_session",
          value: "1",
          url: "http://127.0.0.1:3151",
        },
      ]);
      await page.addInitScript(() => {
        sessionStorage.setItem("dormitory.accessToken", "qa-access");
        sessionStorage.setItem("dormitory.refreshToken", "qa-refresh");
      });
      await page.route("http://127.0.0.1:3199/v1/**", async (route) => {
        const req = route.request(),
          path = new URL(req.url()).pathname.replace("/v1", ""),
          method = req.method();
        const body = req.postDataJSON();
        state.requests.push({ path, method, body });
        const send = (data: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify(
              status >= 400 ? { errors: { message: data } } : { data },
            ),
          });
        if (method === "OPTIONS")
          return route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-headers": "*",
              "access-control-allow-methods": "*",
            },
          });
        if (state.fail && path.includes(state.fail))
          return send("ทดสอบ API ขัดข้อง", 500);
        if (path === "/auth/login")
          return body.password === "invalid-password"
            ? send("Invalid credentials", 401)
            : send({
                accessToken: "qa-login",
                refreshToken: "qa-refresh",
                expiresInSeconds: 3600,
              });
        if (path === "/auth/me")
          return send({
            id: "owner",
            displayName: "เจ้าของทดสอบ",
            roleName: state.platform ? "Platform Admin" : "Owner",
            permissions: state.permissions,
            allBranches: true,
            branchIds: ["branch"],
            isPlatformAdmin: state.platform,
          });
        if (path === "/branches")
          return method === "POST"
            ? send({ ...branch, ...body, id: "new-branch" })
            : send([branch]);
        if (
          path.startsWith("/branches/") &&
          (method === "PATCH" || method === "DELETE")
        )
          return send({ ...branch, ...body });
        if (path.endsWith("/properties")) return send(state.properties);
        if (path === "/room-types")
          return send([{ id: "type", name: "ห้องมาตรฐาน", baseRent: 5000 }]);
        if (path.endsWith("/rooms") && method === "POST") {
          const room = {
            ...body,
            id: "new-room",
            status: "VACANT",
            roomType: { id: "type", name: "ห้องมาตรฐาน", baseRent: 5000 },
          };
          state.properties[0].buildings[0].rooms.push(room);
          return send(room);
        }
        if (path.endsWith("/invites"))
          return send({
            id: "invite",
            roomId: "vacant",
            roomNumber: "106",
            expiresAt: "2026-10-01",
            claimUrl: "https://miniapp.line.me/qa-liff/claim/test",
          });
        if (path.endsWith("/residents")) return send(state.residents);
        if (path.endsWith("/status")) {
          state.residents[0].contracts[0].status = "ENDED";
          return send({ id: "contract", status: "ENDED" });
        }
        if (path.endsWith("/contracts"))
          return send(
            state.residents.map((r) => ({
              ...r.contracts[0],
              branchId: "branch",
              roomId: r.contracts[0].room.id,
              resident: r,
              monthlyRent: 5000,
              deposit: 5000,
              startDate: "2026-01-01",
              billingDay: 1,
            })),
          );
        if (path.endsWith("/invoices") && method === "GET")
          return send(state.invoices);
        if (path.endsWith("/meter-readings/latest")) return send([]);
        if (path.includes("billing-periods"))
          return send({ id: "period", ...body });
        if (path === "/invoices" && method === "POST") {
          const invoice = {
            id: "draft",
            status: "DRAFT",
            ...body,
            total: 5000,
            period: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
            },
            room: { number: "101" },
            contract: {
              id: body.contractId,
              resident: { fullName: "ลูกบ้านทดสอบ" },
            },
            payments: [],
          };
          state.invoices.push(invoice);
          return send(invoice);
        }
        if (path.endsWith("/issue")) {
          const invoice = state.invoices.find(
            (i) => i.id === path.split("/")[2],
          );
          if (invoice) invoice.status = "ISSUED";
          return send({ invoice, notification: { status: "SENT" } });
        }
        if (path.endsWith("/payments/pending")) return send(state.payments);
        if (path.endsWith("/approve")) {
          state.payments = [];
          return send({
            receipt: {
              number: "RC-QA-001",
              amount: 5000,
              lateFee: 0,
              totalAmount: 5000,
              issuedAt: "2026-09-06",
            },
            lateDays: 0,
          });
        }
        if (path.endsWith("/reject")) {
          state.payments = [];
          return send({ id: "pending", status: "REJECTED" });
        }
        if (path === "/users/assignable-roles") return send(data.roles);
        if (path === "/users" && method === "GET") return send(state.users);
        if (path === "/users" && method === "POST") {
          const user = {
            ...body,
            id: "new-user",
            status: "ACTIVE",
            canManage: true,
            role: data.roles.find((r) => r.id === body.roleId),
            branches: body.branchIds.map((id: string) => ({ branch })),
          };
          state.users.push(user);
          return send(user);
        }
        if (path.startsWith("/users/") && method === "PATCH") {
          const user = state.users.find((u) => u.id === path.split("/")[2]);
          Object.assign(user, body, {
            role: data.roles.find((r) => r.id === body.roleId),
            branches: body.branchIds.map((id: string) => ({ branch })),
          });
          return send(user);
        }
        if (path.includes("/line/quota"))
          return send({
            configured: true,
            usage: 22,
            quota: 300,
            remaining: 278,
          });
        if (path.includes("/line/conversations/")) return send([]);
        if (path === "/line/push") return send({ status: "SENT" });
        if (path.endsWith("/promptpay")) {
          if (method === "PUT")
            state.setting = {
              id: "setting",
              branchId: "branch",
              ...body,
              enabled: true,
              previewAmount: 100,
              qrDataUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            };
          return send(state.setting);
        }
        if (path === "/roles" && method === "GET")
          return send(data.roles.map((r) => ({ ...r, _count: { users: 1 } })));
        if (path === "/permissions")
          return send(
            [...new Set(permissions.map((key) => key.split(".")[0]))].map(
              (module) => ({
                module,
                actions: permissions
                  .filter((key) => key.startsWith(module + "."))
                  .map((key) => ({
                    key,
                    action: key.split(".")[1],
                    description: key,
                  })),
              }),
            ),
          );
        if (path === "/platform/stores")
          return method === "POST"
            ? send({
                store: {
                  id: "new-store",
                  name: body.name,
                  slug: body.slug,
                  _count: { branches: 1, users: 1, invoices: 0 },
                  branches: [
                    {
                      id: "main",
                      name: body.branchName,
                      code: body.branchCode,
                    },
                  ],
                },
              })
            : send([]);
        if (path.startsWith("/roles/") && method === "PATCH")
          return send({
            ...data.roles.find((r) => r.id === path.split("/")[2]),
            id: path.split("/")[2],
            permissions: body.permissionKeys.map((key: string) => ({
              permission: { key },
            })),
          });
        if (path === "/roles" && method === "POST")
          return send({
            id: "new-role",
            ...body,
            permissions: [],
            _count: { users: 0 },
          });
        throw new Error("Unhandled API " + method + " " + path);
      });
      await use(state);
    },
    { auto: true },
  ],
});
export { expect };
export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBeTruthy();
}
