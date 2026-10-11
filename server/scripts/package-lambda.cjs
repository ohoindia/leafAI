const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const serverRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(serverRoot, "build");
const artifact = path.join(buildRoot, "lambda");
// Replace only the fixed staging directory inside this server checkout.
if (
  path.dirname(artifact) !== buildRoot ||
  path.basename(artifact) !== "lambda"
) {
  throw new Error("Unexpected Lambda artifact path");
}
fs.rmSync(artifact, { recursive: true, force: true });
fs.mkdirSync(artifact, { recursive: true });
fs.cpSync(path.join(serverRoot, "dist"), path.join(artifact, "dist"), {
  recursive: true,
});
for (const name of ["package.json", "package-lock.json"]) {
  fs.copyFileSync(path.join(serverRoot, name), path.join(artifact, name));
}
// Fetch Linux x64/glibc prebuilds even on Windows; never copy local node_modules.
const install = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "ci",
    "--omit=dev",
    "--include=optional",
    "--ignore-scripts",
    "--os=linux",
    "--cpu=x64",
    "--libc=glibc",
  ],
  { cwd: artifact, stdio: "inherit", shell: process.platform === "win32" },
);
if (install.error) throw install.error;
if (install.status !== 0) process.exit(install.status ?? 1);
for (const name of [
  "dist/lambda.js",
  "node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node",
  "node_modules/argon2/prebuilds/linux-x64/argon2.glibc.node",
]) {
  if (!fs.existsSync(path.join(artifact, name)))
    throw new Error(`Missing Lambda artifact: ${name}`);
}
const libDir = path.join(
  artifact,
  "node_modules/@img/sharp-libvips-linux-x64/lib",
);
if (
  !fs.existsSync(libDir) ||
  !fs.readdirSync(libDir).some((name) => name.startsWith("libvips-cpp.so."))
) {
  throw new Error("Missing Linux libvips binary");
}
if (process.platform === "linux" && process.arch === "x64") {
  const check = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "await import('sharp'); await import('argon2');",
    ],
    {
      cwd: artifact,
      stdio: "inherit",
    },
  );
  if (check.error) throw check.error;
  if (check.status !== 0) process.exit(check.status ?? 1);
}
console.log(`Lambda artifact ready: ${artifact}`);
console.log(
  "Target: Node.js 22, Linux x86_64. SAM packages and uploads this folder automatically.",
);
