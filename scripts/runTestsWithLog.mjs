import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.resolve("logs");
const LOG_FILE = path.join(LOG_DIR, "vitest-errors.log");

async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(LOG_FILE, "", { flag: "w" });
}

async function run() {
  await ensureLogDir();
  const logStream = createWriteStream(LOG_FILE, { flags: "a" });
  const extraArgs = process.argv.slice(2);
  const isWin = process.platform === "win32";
  const command = isWin ? "cmd" : "npx";
  const args = isWin
    ? ["/c", "npx", "vitest", ...extraArgs]
    : ["vitest", ...extraArgs];
  const vitest = spawn(command, args, {
    env: { ...process.env },
    stdio: ["inherit", "pipe", "pipe"],
  });

  vitest.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });

  vitest.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  vitest.on("close", (code) => {
    logStream.end(() => process.exit(code ?? 0));
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
