/*
 * Run `next <command>` with NEXT_DIST_DIR set, portably.
 *
 * `NEXT_DIST_DIR=.next-build next build` is a POSIX-ism: npm runs scripts
 * through cmd.exe on Windows, where an inline VAR=value prefix is a syntax
 * error. Spawning from Node sets the variable the same way everywhere, and
 * every build worker Next forks inherits it.
 */
import { spawn } from "node:child_process";

