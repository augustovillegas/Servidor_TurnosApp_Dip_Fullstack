import { crearSuperadmin } from "./crearSuperadmin.mjs";
import { crearUsuariosRoles } from "./crearUsuariosRoles.mjs";
import { writeSeedFile } from "./lib/seedUtils.mjs";

async function run() {
  const baseUsers = await crearSuperadmin({ persist: false });
  const moduleUsers = await crearUsuariosRoles({ persist: false });
  await writeSeedFile([...baseUsers, ...moduleUsers], "SEED_USERS.md");
  console.log("SEED_USERS.md actualizado en modo offline (sin persistir en la base).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
