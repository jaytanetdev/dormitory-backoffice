import { test, expect, noOverflow } from "./fixtures";
test("B01 no session redirects to login", async ({ page, state }) => {
  await page.context().clearCookies();
  await page.goto("/users");
  await expect(page).toHaveURL(new RegExp("/login"));
});
test("B02 invalid login shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("invalid-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("Invalid credentials");
});
test("B03 login restores original route", async ({ page }) => {
  await page.goto("/login?next=%2Fusers");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/users$"));
  await expect(
    page.getByRole("heading", { name: "สมาชิกทีม", exact: true }),
  ).toBeVisible();
});
test("B04 login refuses external redirect", async ({ page }) => {
  await page.goto("/login?next=https%3A%2F%2Fexample.invalid");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/dashboard$"));
});
for (const route of [
  "/dashboard",
  "/bills",
  "/payments",
  "/calendar",
  "/reports",
  "/rooms",
  "/residents",
  "/chat",
  "/stores",
  "/users",
  "/settings",
])
  test("B05 route renders " + route, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.locator("[role=alert]:not(#__next-route-announcer__)"),
    ).toHaveCount(0);
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
test("B06 mobile menu opens, navigates and closes", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await expect(page.getByRole("button", { name: "เปิดเมนู" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "สมาชิกทีม" })
    .click();
  await expect(page).toHaveURL(new RegExp("/users"));
  await expect(page.getByRole("button", { name: "เปิดเมนู" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
test("B07 team search has empty state", async ({ page }) => {
  await page.goto("/users");
  await page.getByLabel("ค้นหาสมาชิกทีม").fill("not-found");
  await expect(page.getByText("ไม่พบสมาชิกที่ตรงกับการค้นหา")).toBeVisible();
});
test("B08 create team member with branch and role", async ({ page, state }) => {
  await page.goto("/users");
  await page.getByRole("button", { name: /เพิ่มสมาชิกทีม/ }).click();
  await page.getByLabel("ชื่อสมาชิก").fill("ทีมใหม่ทดสอบ");
  await page.getByLabel("อีเมลเข้าสู่ระบบ").fill("new@example.invalid");
  await page.getByLabel("รหัสผ่านเริ่มต้น").fill("TestPassword123!");
  await page.getByRole("checkbox", { name: "สาขาทดสอบ", exact: true }).check();
  await page.getByRole("button", { name: "บันทึกสมาชิก", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("ทีมใหม่ทดสอบ", { exact: true })).toBeVisible();
  const req = state.requests.find(
    (r) => r.path === "/users" && r.method === "POST",
  );
  expect(req.body).toMatchObject({
    displayName: "ทีมใหม่ทดสอบ",
    email: "new@example.invalid",
    allBranches: false,
    branchIds: ["branch"],
  });
});
test("B09 edit staff cannot edit own protected account", async ({
  page,
  state,
}) => {
  await page.goto("/users");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "owner@example.invalid" })
      .getByRole("button", { name: "แก้ไข" }),
  ).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "team@example.invalid" })
    .getByRole("button", { name: "แก้ไข" })
    .click();
  await page.getByLabel("ชื่อสมาชิก").fill("เปลี่ยนชื่อทดสอบ");
  await page.getByRole("button", { name: "บันทึกสมาชิก", exact: true }).click();
  await expect(
    page.getByText("เปลี่ยนชื่อทดสอบ", { exact: true }),
  ).toBeVisible();
  expect(
    state.requests.some(
      (r) => r.path === "/users/team" && r.method === "PATCH",
    ),
  ).toBeTruthy();
});
test("B10 read-only team cannot create or edit", async ({ page, state }) => {
  state.permissions = state.permissions.filter(
    (p) => !["user.create", "user.update"].includes(p),
  );
  await page.goto("/users");
  await expect(page.getByText("สมาชิกทดสอบ", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /เพิ่มสมาชิกทีม|แก้ไข/ }),
  ).toHaveCount(0);
});
test("B11 slip preview closes with Escape", async ({ page }) => {
  await page.goto("/payments");
  await page.getByRole("button", { name: "ดูสลิป" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("B12 approve payment generates receipt and removes pending", async ({
  page,
  state,
}) => {
  await page.goto("/payments");
  await page.getByRole("button", { name: "อนุมัติยอด" }).click();
  await expect(page.getByText("RC-QA-001")).toBeVisible();
  await expect(page.getByText("ไม่มีรายการรอตรวจสอบในสาขานี้")).toBeVisible();
  expect(
    state.requests.filter((r) => r.path === "/payments/pending/approve"),
  ).toHaveLength(1);
});
test("B13 reject needs reason and removes pending", async ({ page, state }) => {
  await page.goto("/payments");
  await page.getByRole("button", { name: "ปฏิเสธ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ยืนยันปฏิเสธ" }),
  ).toBeDisabled();
  await page.getByLabel("เหตุผลที่ปฏิเสธ").fill("ยอดไม่ตรง");
  await page.getByRole("button", { name: "ยืนยันปฏิเสธ" }).click();
  await expect(page.getByText("ไม่มีรายการรอตรวจสอบในสาขานี้")).toBeVisible();
  expect(
    state.requests.find((r) => r.path === "/payments/pending/reject").body,
  ).toEqual({ reason: "ยอดไม่ตรง" });
});
test("B14 failed approval preserves pending row", async ({ page, state }) => {
  state.fail = "/approve";
  await page.goto("/payments");
  await page.getByRole("button", { name: "อนุมัติยอด" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ทดสอบ API ขัดข้อง");
  await expect(page.getByRole("button", { name: "อนุมัติยอด" })).toBeEnabled();
});
test("B15 reports display approved and unpaid totals", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByText("INV-QA-1")).toBeVisible();
  await expect(page.getByText("INV-QA-5")).toBeVisible();
});
test("B16 room search and vacant invite", async ({ page, state }) => {
  await page.goto("/rooms");
  await page.getByPlaceholder("ค้นหาเลขห้อง ชั้น ประเภท หรืออาคาร").fill("106");
  await expect(page.getByRole("row").filter({ hasText: "106" })).toBeVisible();
  await page
    .getByRole("button", { name: /ลิงก์|เชิญ/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    state.requests.some((r) => r.path === "/rooms/vacant/invites"),
  ).toBeTruthy();
});
test("B17 resident search and move out", async ({ page, state }) => {
  await page.goto("/residents");
  await page.getByLabel("ค้นหาผู้เช่า").fill("ลูกบ้านทดสอบ");
  await page.getByRole("button", { name: "ย้ายออก", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: /ยืนยันย้ายออก|ยืนยันการย้ายออก/ })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    state.requests.find((r) => r.path === "/contracts/contract/status").body
      .status,
  ).toBe("ENDED");
});
test("B18 PromptPay saves branch setting", async ({ page, state }) => {
  await page.goto("/settings");
  await page.getByLabel("หมายเลขที่ผูก PromptPay").fill("0812345678");
  await page.getByLabel("ชื่อบัญชีที่แสดงให้ผู้เช่า").fill("บัญชีทดสอบ");
  await page.getByRole("button", { name: "บันทึกการตั้งค่า" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "บันทึก PromptPay" }),
  ).toBeVisible();
  expect(
    state.requests.find(
      (r) => r.path === "/branches/branch/promptpay" && r.method === "PUT",
    ).body,
  ).toMatchObject({
    type: "PHONE",
    target: "0812345678",
    accountName: "บัญชีทดสอบ",
  });
});
test("B19 sidebar quota includes next reset month", async ({ page }, info) => {
  await page.goto("/dashboard");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "เปิดเมนู" }).click();
  const quota = page.getByRole("region", { name: "โควตาแจ้งเตือน LINE" });
  await expect(quota).toContainText("278");
  await expect(quota).toContainText("เริ่มรอบเดือนถัดไป");
  await expect(quota.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    String((22 / 300) * 100),
  );
});
test("B20 owner does not see platform role editor", async ({ page }, info) => {
  await page.goto("/users");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "บทบาทและสิทธิ์" }),
  ).toHaveCount(0);
});
test("B21 platform routes render for administrator", async ({
  page,
  state,
}) => {
  state.platform = true;
  await page.goto("/platform/stores");
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/roles");
  await expect(page.locator("h1")).toBeVisible();
});
test("B22 API list failure is visible", async ({ page, state }) => {
  state.fail = "/users";
  await page.goto("/users");
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ทดสอบ API ขัดข้อง");
});

for (const [route, permission, button] of [
  ["/payments", "payment.approve", "อนุมัติยอด"],
  ["/rooms", "room.create", "＋ เพิ่มห้อง"],
  ["/rooms", "contract.invite", "สร้างลิงก์"],
  ["/residents", "contract.update", "ย้ายออก"],
  ["/bills", "invoice.create", "＋ สร้างใบแจ้งหนี้"],
])
  test("B23 read-only blocks " + permission, async ({ page, state }) => {
    state.permissions = state.permissions.filter((p) => p !== permission);
    await page.goto(route);
    await expect(
      page.getByRole("button", { name: button, exact: true }).first(),
    ).toBeDisabled();
  });
test("B24 create draft then issue invoice", async ({ page, state }) => {
  state.invoices = [];
  await page.goto("/bills");
  await page.getByRole("button", { name: /สร้างใบแจ้งหนี้/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "บันทึกแบบร่าง" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const req = state.requests.find(
    (r) => r.path === "/invoices" && r.method === "POST",
  );
  expect(req.body).toMatchObject({
    branchId: "branch",
    contractId: "contract",
    discount: 0,
  });
  expect(req.body.items[0]).toMatchObject({
    code: "RENT",
    quantity: 1,
    unitPrice: 5000,
  });
  await page.getByRole("combobox").filter({ hasText: "ยังไม่ออกบิล" }).click();
  await page.getByRole("option", { name: /มีบิลแล้ว/ }).click();
  await page
    .getByRole("button", { name: "ออกบิล + แจ้ง LINE", exact: true })
    .first()
    .click();
  expect(
    state.requests.some((r) => r.path === "/invoices/draft/issue"),
  ).toBeTruthy();
});
test("B25 create room in existing building and type", async ({
  page,
  state,
}) => {
  await page.goto("/rooms");
  await page.getByRole("button", { name: "＋ เพิ่มห้อง", exact: true }).click();
  await page.getByLabel("ชื่ออาคาร", { exact: true }).fill("อาคาร A");
  await page.getByLabel("ประเภทห้อง", { exact: true }).fill("ห้องมาตรฐาน");
  await page.getByLabel("เลขห้อง", { exact: true }).fill("107");
  await page.getByLabel("ค่าเช่าต่อเดือน", { exact: true }).fill("5000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "เพิ่มห้อง", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "107" })).toBeVisible();
  expect(
    state.requests.find((r) => r.path === "/buildings/building/rooms").body,
  ).toMatchObject({ number: "107", roomTypeId: "type", monthlyRent: 5000 });
});
test("B26 theme persists after reload", async ({ page }) => {
  await page.goto("/users");
  await page.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("B27 graph tooltip shows actual billed and collected amounts", async ({
  page,
}, info) => {
  await page.goto("/dashboard");
  const column = page
    .getByRole("group", {
      name: "กราฟยอดเงินย้อนหลัง 6 เดือน ชี้หรือแตะเดือนเพื่อดูยอดเงิน",
    })
    .getByRole("button")
    .last();
  if (info.project.name === "mobile") await column.tap();
  else await column.hover();
  await expect(page.getByRole("tooltip")).toContainText("25,000");
  await expect(page.getByRole("tooltip")).toContainText("7,000");
});
test("B28 CSV download contains all invoices", async ({ page }) => {
  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("INV-QA-1");
  expect(csv).toContain("INV-QA-5");
  expect(csv).toContain("สมใจ ตัวอย่าง");
});
test("B29 chat sends text to selected resident and updates conversation", async ({
  page,
  state,
}) => {
  await page.goto("/chat");
  await page.getByRole("button", { name: /ลูกบ้านทดสอบ/ }).click();
  await page.getByPlaceholder("พิมพ์ข้อความ...").fill("ข้อความทดสอบ");
  await page.getByRole("button", { name: "ส่ง", exact: true }).click();
  await expect(page.locator(".chat-bubble")).toContainText("ข้อความทดสอบ");
  expect(state.requests.find((r) => r.path === "/line/push").body).toEqual({
    residentId: "resident",
    template: "staff-chat",
    payload: { message: "ข้อความทดสอบ" },
  });
});
test("B30 unlinked LINE cannot send chat", async ({ page, state }) => {
  state.residents[0].lineIdentity = null;
  await page.goto("/chat");
  await page.getByRole("button", { name: /ลูกบ้านทดสอบ/ }).click();
  await expect(
    page.getByPlaceholder("ลูกบ้านยังไม่ได้เชื่อม LINE"),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "ส่ง", exact: true }),
  ).toBeDisabled();
});
test("B31 branch edit omits unchanged credentials", async ({ page, state }) => {
  await page.goto("/stores");
  await page.getByRole("button", { name: "ตั้งค่าสาขา" }).click();
  await page.getByLabel("ชื่อสาขา", { exact: true }).fill("สาขาแก้ไข");
  await page.getByLabel("Mini App Channel ID", { exact: true }).fill("12345");
  await page
    .getByLabel("Messaging API Channel ID", { exact: true })
    .fill("67890");
  await page
    .getByRole("button", { name: "บันทึกการตั้งค่า", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const req = state.requests.find(
    (r) => r.path === "/branches/branch" && r.method === "PATCH",
  );
  expect(req.body.name).toBe("สาขาแก้ไข");
  expect(req.body).not.toHaveProperty("lineMiniAppChannelSecret");
  expect(req.body).not.toHaveProperty("lineMessagingAccessToken");
});
test("B32 branch deletion failure retains card", async ({ page, state }) => {
  state.fail = "/branches/branch";
  await page.goto("/stores");
  await page.getByRole("button", { name: "ลบสาขา", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยันลบสาขา" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ทดสอบ API ขัดข้อง");
  await expect(page.locator(".branch-card")).toHaveCount(1);
});
test("B33 create platform store and first owner", async ({ page, state }) => {
  state.platform = true;
  await page.goto("/platform/stores");
  await page.getByRole("button", { name: "สร้างร้านค้า", exact: true }).click();
  await page.getByLabel("ชื่อร้าน", { exact: true }).fill("ร้านทดสอบ");
  await page.getByLabel("รหัสร้านสำหรับ Login").fill("qa-store");
  await page.getByLabel("ชื่อสาขาหลัก").fill("สาขาหลัก");
  await page.getByLabel("ชื่อผู้ดูแลร้าน").fill("เจ้าของทดสอบ");
  await page.getByLabel("อีเมล", { exact: true }).fill("owner@example.invalid");
  await page.getByLabel("รหัสผ่านเริ่มต้น").fill("TestPassword123!");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "สร้างร้านค้า", exact: true })
    .click();
  await expect(page.locator(".platform-store-card")).toContainText("ร้านทดสอบ");
  expect(
    state.requests.find(
      (r) => r.path === "/platform/stores" && r.method === "POST",
    ).body.slug,
  ).toBe("qa-store");
});
test("B34 read-only branches cannot edit or delete", async ({
  page,
  state,
}) => {
  state.permissions = state.permissions.filter(
    (p) => !["branch.create", "branch.update"].includes(p),
  );
  await page.goto("/stores");
  for (const name of ["＋ เพิ่มสาขา", "ตั้งค่าสาขา", "ลบสาขา"])
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
});
test("B35 report role does not request forbidden contracts or settings", async ({
  page,
  state,
}) => {
  state.permissions = [
    "branch.view",
    "property.view",
    "room.view",
    "resident.view",
    "invoice.view",
    "payment.view",
    "report.view",
    "report.export",
  ];
  await page.goto("/bills");
  await expect(
    page.getByRole("heading", { name: "ใบแจ้งหนี้", exact: true }),
  ).toBeVisible();
  expect(
    state.requests.some(
      (r) => r.path.endsWith("/contracts") || r.path.endsWith("/promptpay"),
    ),
  ).toBeFalsy();
  await expect(
    page.getByRole("button", { name: "＋ สร้างใบแจ้งหนี้" }),
  ).toBeDisabled();
});

test("B36 platform can create role and save permissions", async ({
  page,
  state,
}) => {
  state.platform = true;
  await page.goto("/roles");
  await page.getByRole("button", { name: "＋ สร้างบทบาท" }).click();
  await page.getByLabel("ชื่อหรือเลขอ้างอิง").fill("บทบาททดสอบ");
  await page.getByRole("button", { name: "บันทึกข้อมูล" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "บทบาททดสอบ", exact: true }),
  ).toBeVisible();
  await page.locator(".permission-option").first().click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("button", { name: "บันทึกสิทธิ์" }).click();
  expect(
    state.requests.some(
      (r) => r.path === "/roles/new-role/permissions" && r.method === "PATCH",
    ),
  ).toBeTruthy();
});

test("B37 create branch with independent LINE credentials", async ({
  page,
  state,
}) => {
  await page.goto("/stores");
  await page.getByRole("button", { name: "＋ เพิ่มสาขา" }).click();
  await page.getByLabel("ชื่อสาขา", { exact: true }).fill("สาขาใหม่");
  await page.getByLabel("รหัสสาขา", { exact: true }).fill("NEW");
  await page.getByLabel("ชื่อ Mini App", { exact: true }).fill("QA Mini App");
  await page.getByLabel("Mini App Channel ID", { exact: true }).fill("12345");
  await page.getByLabel("LIFF ID", { exact: true }).fill("12345-qa");
  await page
    .getByLabel("Mini App Channel secret", { exact: true })
    .fill("fake-mini-secret-for-test");
  await page
    .getByLabel("Messaging API Channel ID", { exact: true })
    .fill("67890");
  await page
    .getByLabel("Channel access token", { exact: true })
    .fill("fake-messaging-token-for-test");
  await page
    .getByLabel("Messaging API Channel secret", { exact: true })
    .fill("fake-messaging-secret-for-test");
  await page.getByRole("button", { name: "สร้างสาขาและลิงก์" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator(".branch-card").filter({ hasText: "สาขาใหม่" }),
  ).toBeVisible();
  expect(
    state.requests.find((r) => r.path === "/branches" && r.method === "POST")
      .body,
  ).toMatchObject({
    code: "NEW",
    lineMiniAppChannelId: "12345",
    lineMessagingChannelId: "67890",
  });
});
test("B38 suspend team account updates status", async ({ page, state }) => {
  await page.goto("/users");
  await page
    .getByRole("row")
    .filter({ hasText: "team@example.invalid" })
    .getByRole("button", { name: "แก้ไข" })
    .click();
  await page
    .getByRole("dialog")
    .locator("label")
    .filter({ hasText: "สถานะบัญชี" })
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "พักบัญชี", exact: true }).click();
  await page.getByRole("button", { name: "บันทึกสมาชิก" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "team@example.invalid" }),
  ).toContainText("พักบัญชี");
  expect(
    state.requests.find((r) => r.path === "/users/team" && r.method === "PATCH")
      .body.status,
  ).toBe("SUSPENDED");
});

test("B39 modal dismiss button has readable contrast in both themes", async ({ page }) => {
  await page.goto("/bills");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    await page.getByRole("button", { name: /สร้างใบแจ้งหนี้/ }).click();
    const dismiss = page.getByRole("dialog").locator(".button.ghost");
    await expect(dismiss).toBeVisible();
    const contrast = await dismiss.evaluate(button => {
      const style = getComputedStyle(button);
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      };
      const foreground = luminance(style.color), background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await dismiss.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
