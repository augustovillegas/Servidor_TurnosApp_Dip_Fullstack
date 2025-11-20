import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.resolve("logs");
const LOG_FILE = path.join(LOG_DIR, "vitest-errors.log");
const TEST_DIR = path.resolve("tests");

async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(LOG_FILE, "", { flag: "w" });
}

async function listTestFiles() {
  const files = await readdir(TEST_DIR, { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => path.join("tests", entry.name))
    .sort();
}

function spawnVitest(args, logStream) {
  const isWin = process.platform === "win32";
  const command = isWin ? "cmd" : "npx";
  const cliArgs = isWin ? ["/c", "npx", "vitest", ...args] : ["vitest", ...args];

  return new Promise((resolve, reject) => {
    const vitest = spawn(command, cliArgs, {
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
      if (code === 0) {
        resolve();
      } else {
        reject(code ?? 1);
      }
    });
  });
}

async function run() {
  await ensureLogDir();
  const logStream = createWriteStream(LOG_FILE, { flags: "a" });
  const extraArgs = process.argv.slice(2);

  try {
    if (extraArgs.length) {
      await spawnVitest(extraArgs, logStream);
    } else {
      const testFiles = await listTestFiles();
      for (const file of testFiles) {
        console.log(`\n[vitest] Ejecutando ${file}...\n`);
        await spawnVitest(["run", file], logStream);
      }
    }
    logStream.end(() => process.exit(0));
  } catch (code) {
    logStream.end(() => process.exit(typeof code === "number" ? code : 1));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
