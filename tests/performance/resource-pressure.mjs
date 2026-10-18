import { createHash } from "node:crypto";

// Keep 64 MiB resident and burn one CPU in a disposable, resource-capped
// health-demo container while the separate k6 process applies baseline RPS.
const residentMemory = Buffer.alloc(64 * 1024 * 1024, 0x5a);
const workingSet = residentMemory.subarray(0, 64 * 1024);

setInterval(() => {
  let digest = workingSet;
  for (let iteration = 0; iteration < 4000; iteration += 1) {
    digest = createHash("sha256").update(digest).digest();
  }
  if (digest.length === 0) {
    process.exitCode = 1;
  }
}, 0);

process.on("SIGTERM", () => {
  residentMemory.fill(0);
  process.exit(0);
});
