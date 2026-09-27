import { spawn, execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
export default async function setup() {
  const originalConfig = readFileSync("tsconfig.json", "utf8");
  const originalEnv = readFileSync("next-env.d.ts", "utf8").replaceAll(
    ".next-e2e/",
    ".next/",
  );
  const restoreGenerated = () => {
    const current = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    const before = JSON.parse(originalConfig);
    current.include = current.include.filter(
      (entry: string) => entry !== ".next-e2e/types/**/*.ts",
    );
    before.include = before.include.filter(
      (entry: string) => entry !== ".next-e2e/types/**/*.ts",
    );
    const normalize = (value: typeof current) => ({
      ...value,
      include: [...value.include].sort(),
    });
    if (
      JSON.stringify(normalize(current)) === JSON.stringify(normalize(before))
    )
      writeFileSync("tsconfig.json", originalConfig);
    const env = readFileSync("next-env.d.ts", "utf8").replaceAll(
      ".next-e2e/",
      ".next/",
    );
    if (env === originalEnv) writeFileSync("next-env.d.ts", originalEnv);
  };
  const cwd = process.cwd(),
    port = Number(process.env.E2E_PORT || "3151");
  mkdirSync("test-results", { recursive: true });
  const log = openSync("test-results/server.log", "w");
  const require = createRequire(path.join(cwd, "package.json"));
  const child = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "dev",
      "-p",
      String(port),
      "--hostname",
      "127.0.0.1",
    ],
    {
      cwd,
      windowsHide: true,
      stdio: ["ignore", log, log],
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_MOCK_MODE: "false",
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:3199/v1",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  const stop = () =>
    new Promise<void>((resolve) => {
      if (process.platform === "win32" && child.pid)
        execFile(
          "taskkill",
          ["/pid", String(child.pid), "/T", "/F"],
          { windowsHide: true },
          () => {
            restoreGenerated();
            resolve();
          },
        );
      else {
        child.kill("SIGTERM");
        child.once("exit", () => {
          restoreGenerated();
          resolve();
        });
      }
    });
  try {
    for (let i = 0; i < 180; i++) {
      if (child.exitCode !== null)
        throw new Error("E2E server exited; see test-results/server.log");
      try {
        if ((await fetch("http://127.0.0.1:" + port + "/login")).ok)
          return stop;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("E2E server startup timeout; see test-results/server.log");
  } catch (error) {
    await stop();
    throw error;
  }
}
