/**
 * Wrapper CLI para ejecutar el seed completo con confirmacion opcional.
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ejecutarSeedCompleto } from "./seedCompleto.mjs";

const argv = yargs(hideBin(process.argv))
  .option("interactive", {
    type: "boolean",
    default: true,
    describe: "Pide confirmacion manual antes de ejecutar el seed",
  })
  .parse();

async function askConfirmation() {
  const rl = readline.createInterface({ input, output });
  console.log("\n[WARN] Este script eliminara y recreara los datos en la base 'App-turnos'.");
  const answer = (await rl.question("Escribe SI para continuar: ")).trim().toUpperCase();
  await rl.close();
  if (answer !== "SI") {
    console.log("[INFO] Operacion cancelada por el usuario.");
    process.exit(0);
  }
}

async function main() {
  if (argv.interactive) {
    await askConfirmation();
  } else {
    console.log("[INFO] Ejecutando sin confirmacion interactiva (--interactive=false).");
  }

  await ejecutarSeedCompleto();
}

main().catch((err) => {
  console.error("\n[ERROR] Hubo un problema durante el proceso de seed:", err);
  process.exit(1);
});
