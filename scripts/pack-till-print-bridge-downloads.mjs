#!/usr/bin/env node
/**
 * Pack Till Print Bridge download zips into public/downloads/.
 * Run: node scripts/pack-till-print-bridge-downloads.mjs
 * Also runs automatically before `next build` if wired in package.json.
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  writeFileSync,
  chmodSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(__dirname, "..");
const OUT = join(FRONTEND, "public", "downloads");
const KIT = join(__dirname, "download-kit");
const BRIDGE = join(__dirname, "till-print-bridge.mjs");
const STAGE = join(OUT, ".stage-till-print-bridge");

function mustExist(p) {
  if (!existsSync(p)) throw new Error(`Missing ${p}`);
}

function zipDir(srcDir, zipPath) {
  rmSync(zipPath, { force: true });
  const r = spawnSync("zip", ["-r", "-q", zipPath, "."], {
    cwd: srcDir,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `zip failed for ${zipPath}`);
  }
}

mustExist(BRIDGE);
mustExist(KIT);

mkdirSync(OUT, { recursive: true });
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

const common = [
  ["till-print-bridge.mjs", BRIDGE],
  ["INSTALL.txt", join(KIT, "INSTALL.txt")],
];

const packages = [
  {
    id: "macos",
    zip: "palmart-till-print-bridge-macos.zip",
    files: [
      ...common,
      [
        "Install Palmart Print Bridge.command",
        join(KIT, "Install Palmart Print Bridge.command"),
      ],
      [
        "start-till-print-bridge.command",
        join(__dirname, "start-till-print-bridge.command"),
      ],
    ],
  },
  {
    id: "windows",
    zip: "palmart-till-print-bridge-windows.zip",
    files: [
      ...common,
      [
        "Install-Palmart-Print-Bridge.cmd",
        join(KIT, "Install-Palmart-Print-Bridge.cmd"),
      ],
      [
        "Install-Palmart-Print-Bridge.ps1",
        join(KIT, "Install-Palmart-Print-Bridge.ps1"),
      ],
      [
        "start-till-print-bridge.cmd",
        join(__dirname, "start-till-print-bridge.cmd"),
      ],
    ],
  },
  {
    id: "linux",
    zip: "palmart-till-print-bridge-linux.zip",
    files: [
      ...common,
      [
        "install-palmart-print-bridge.sh",
        join(KIT, "install-palmart-print-bridge.sh"),
      ],
    ],
  },
];

const built = [];
for (const pkg of packages) {
  const dir = join(STAGE, pkg.id);
  mkdirSync(dir, { recursive: true });
  for (const [name, src] of pkg.files) {
    mustExist(src);
    const dest = join(dir, name);
    copyFileSync(src, dest);
    if (name.endsWith(".command") || name.endsWith(".sh") || name.endsWith(".mjs")) {
      try {
        chmodSync(dest, 0o755);
      } catch {
        // ignore on platforms without chmod semantics
      }
    }
  }
  const zipPath = join(OUT, pkg.zip);
  zipDir(dir, zipPath);
  built.push(pkg.zip);
  console.log(`Wrote ${zipPath}`);
}

writeFileSync(
  join(OUT, "till-print-bridge-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: built,
      note: "Unzip, run the installer for your OS, then Detect printers in Cashier.",
    },
    null,
    2,
  ) + "\n",
);

rmSync(STAGE, { recursive: true, force: true });
console.log("Done. Downloads in public/downloads/");
