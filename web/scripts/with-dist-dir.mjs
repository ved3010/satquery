/*
 * Run `next <command>` with NEXT_DIST_DIR set, portably.
 *
 * `NEXT_DIST_DIR=.next-build next build` is a POSIX-ism: npm runs scripts
 * through cmd.exe on Windows, where an inline VAR=value prefix is a syntax
 * error. Spawning from Node sets the variable the same way everywhere, and
 * every build worker Next forks inherits it.
 */
import { spawn } from "node:child_process";

const [command, ...rest] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-dist-dir.mjs <next-command> [args]");
  process.exit(2);
}

const child = spawn(
  process.platform === "win32" ? "next.cmd" : "next",
  [command, ...rest],
  {
    stdio: "inherit",
    env: { ...process.env, NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-build" },
    shell: process.platform === "win32",
  },
);

child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
