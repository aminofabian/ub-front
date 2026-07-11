#!/usr/bin/env node
/**
 * Till Print Bridge — run on the cashier Mac (USB/CUPS thermal printer).
 *
 * Cloud-hosted Palmart cannot reach your USB printer. This small local server
 * listens on 127.0.0.1:19500 and accepts raw ESC/POS from the browser.
 *
 * Usage (on the till Mac, leave running):
 *   pnpm till-print-bridge
 *
 * Then open your online cashier as usual and print — the browser posts to
 * localhost and this process runs `lp -o raw` with the CUPS name from
 * Branches → Receipt details.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.TILL_PRINT_BRIDGE_PORT || 19500);
const HOST = "127.0.0.1";
const LP_BIN = ["/usr/bin/lp", "/bin/lp"].find((p) => existsSync(p));
const CUPS_NAME_RE = /^[A-Za-z0-9._-]+$/;
const MAX_BODY = 256_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Printer-Cups-Name, X-Printer-Host, X-Printer-Port",
};

function send(res, status, body, type = "text/plain") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    ...CORS,
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendCups(name, data) {
  return new Promise((resolve, reject) => {
    if (!LP_BIN) {
      reject(new Error("CUPS lp not found (expected /usr/bin/lp on macOS)"));
      return;
    }
    const file = join(tmpdir(), `palmart-escpos-${process.pid}-${Date.now()}.bin`);
    writeFile(file, data)
      .then(() => {
        const child = spawn(
          LP_BIN,
          [
            "-d",
            name,
            "-o",
            "raw",
            "-o",
            "document-format=application/vnd.cups-raw",
            file,
          ],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        let stderr = "";
        child.stderr.on("data", (c) => {
          stderr += c.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
          unlink(file).catch(() => undefined);
          if (code === 0) resolve();
          else
            reject(
              new Error(
                stderr.trim() ||
                  `lp exited ${code} for queue "${name}" (check lpstat -v)`,
              ),
            );
        });
      })
      .catch(reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && (url === "/health" || url === "/health/")) {
    send(
      res,
      200,
      {
        ok: true,
        cups: Boolean(LP_BIN),
        port: PORT,
      },
      "application/json",
    );
    return;
  }

  if (req.method === "POST" && (url === "/print" || url === "/print/")) {
    const cups = req.headers["x-printer-cups-name"]?.trim();
    if (!cups || !CUPS_NAME_RE.test(cups)) {
      send(
        res,
        400,
        "Missing or invalid X-Printer-Cups-Name header (set under Branches → Receipt details)",
      );
      return;
    }
    const body = await readRequest(req);
    if (body.length === 0) {
      send(res, 400, "empty body");
      return;
    }
    if (body.length > MAX_BODY) {
      send(res, 413, "payload too large");
      return;
    }
    try {
      await sendCups(cups, body);
      send(res, 200, JSON.stringify({ ok: true, mode: "cups", name: cups }), "application/json");
    } catch (e) {
      send(res, 502, e instanceof Error ? e.message : String(e));
    }
    return;
  }

  send(res, 404, "not found");
});

server.listen(PORT, HOST, () => {
  console.log(`Till Print Bridge listening on http://${HOST}:${PORT}`);
  console.log(`CUPS lp: ${LP_BIN ?? "NOT FOUND"}`);
  console.log("Leave this running while using cloud cashier. Press Ctrl+C to stop.");
});
