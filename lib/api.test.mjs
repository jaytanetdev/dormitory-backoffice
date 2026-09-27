import test from "node:test";
import assert from "node:assert/strict";
process.env.NEXT_PUBLIC_API_URL = "http://api.example.invalid/v1";
process.env.NEXT_PUBLIC_MOCK_MODE = "false";
const values = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  },
  dispatchEvent() {},
};
globalThis.document = { cookie: "" };
const { apiGet, apiMutation, saveSession, hasSession, clearSession, login } =
  await import("./api.ts");
const response = (data, status = 200) =>
  new Response(
    JSON.stringify(status >= 400 ? { errors: { message: data } } : { data }),
    { status, headers: { "Content-Type": "application/json" } },
  );
test("session save and clear updates tokens and cookie", () => {
  saveSession({ accessToken: "old", refreshToken: "refresh" });
  assert.equal(hasSession(), true);
  assert.match(document.cookie, /dormitory_session=1/);
  clearSession();
  assert.equal(hasSession(), false);
});
test("parallel 401 responses rotate refresh only once and retry with new access", async () => {
  saveSession({ accessToken: "old", refreshToken: "refresh" });
  let rotations = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      rotations++;
      await new Promise((r) => setTimeout(r, 20));
      return response({ accessToken: "new", refreshToken: "rotated" });
    }
    return options.headers.Authorization === "Bearer new"
      ? response({ ok: true })
      : response("expired", 401);
  };
  const results = await Promise.all([
    apiGet("/rooms", []),
    apiGet("/bills", []),
    apiGet("/payments", []),
  ]);
  assert.equal(rotations, 1);
  assert.ok(results.every((result) => result.ok));
});
test("failed refresh clears session and returns 401", async () => {
  saveSession({ accessToken: "old", refreshToken: "refresh" });
  globalThis.fetch = async () => response("expired", 401);
  const result = await apiGet("/rooms", []);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(hasSession(), false);
});
test("network failures return an actionable error", async () => {
  globalThis.fetch = async () => {
    throw Error("offline");
  };
  assert.equal((await apiGet("/rooms", [])).ok, false);
});
test("mutation retains server validation message", async () => {
  globalThis.fetch = async () => response("ยอดไม่ตรง", 400);
  assert.equal(
    (await apiMutation("/payments/1/reject", {})).message,
    "ยอดไม่ตรง",
  );
});
test("login failures do not create a session", async () => {
  clearSession();
  globalThis.fetch = async () => response("Invalid credentials", 401);
  assert.equal((await login("x", "bad", "store")).ok, false);
  assert.equal(hasSession(), false);
});
