import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const CLONE_ROOT = "submodules";
const CLONE_URL = "https://github.com/mathewthe2/immersion-kit-api.git";
const CLONE_FOLDER = CLONE_URL.replace(/^.+\//, "").replace(/\..+?$/, "");

export async function clone() {
  const cwd = process.cwd();
  try {
    process.chdir(CLONE_ROOT);

    if (!existsSync(CLONE_FOLDER)) {
      spawnSync("git", ["clone", CLONE_URL, CLONE_FOLDER, "--depth=1"], {
        stdio: "inherit",
      });
    }
  } finally {
    process.chdir(cwd);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await clone();
}
