#!/usr/bin/env node
// scripts/aimtctl.mjs
// Reference CLI untuk dipanggil AI agent via run_command.
// Prinsip: stdout HANYA JSON; log/error ke stderr; exit code bermakna.

import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MAX_OUTPUT = 1_000_000; // 1 MB per stream (bibit policy)

function parseArgs(argv) {
  const opts = { profile: "wasm-echo", output: "json", timeoutMs: 5000, args: [] };
  let afterDash = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (afterDash) { opts.args.push(a); continue; }
    if (a === "--") { afterDash = true; continue; }
    if (a === "--profile") { opts.profile = argv[++i]; continue; }
    if (a === "--output") { opts.output = argv[++i]; continue; }
    if (a === "--timeout-ms") { opts.timeoutMs = Number(argv[++i]) || 5000; continue; }
    opts.args.push(a); // argumen tanpa flag = args ke tool
  }
  return opts;
}

// cari wasm dari beberapa kandidat (path relatif terhadap cwd = project root)
function resolveWasm(cwd) {
  const candidates = [
    process.env.AIMT_WASM,
    resolve(cwd, "wasm/wasm-echo.wasm"),
    resolve(cwd, "artifacts/wasm/wasm-echo.wasm"),
    resolve(cwd, "target/wasm32-wasip1/release/wasm-echo.wasm"),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

function detectWasmtime() {
  try { return execSync("wasmtime --version").toString().trim(); }
  catch { return null; }
}

function run(wasm, args, timeoutMs) {
  return new Promise((res) => {
    const start = Date.now();
    let stdout = "", stderr = "", truncated = false, timedOut = false;

    const child = spawn("wasmtime", ["run", "--", wasm, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);

    const append = (which, data) => {
      const s = data.toString();
      if (which === "out") { if (stdout.length < MAX_OUTPUT) stdout += s; else truncated = true; }
      else { if (stderr.length < MAX_OUTPUT) stderr += s; else truncated = true; }
    };

    child.stdout.on("data", (d) => append("out", d));
    child.stderr.on("data", (d) => append("err", d));

    child.on("error", (e) => {
      clearTimeout(timer);
      res({ exit_code: -1, timed_out: timedOut, truncated, stdout, stderr: stderr + "\n[spawn error] " + e.message, wall_time_ms: Date.now() - start });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      res({ exit_code: code ?? -1, timed_out: timedOut, truncated, stdout, stderr, wall_time_ms: Date.now() - start });
    });
  });
}

function emit(opts, obj, code) {
  if (opts.output === "json") console.log(JSON.stringify(obj));
  else process.stdout.write(obj.stdout ?? "");
  process.exit(code);
}

// ---- main ----
const [,, cmd, ...rest] = process.argv;
if (cmd !== "run") {
  console.error("usage: aimtctl run [--profile wasm-echo] [--output json] [--timeout-ms 5000] -- <args...>");
  process.exit(2);
}

const opts = parseArgs(rest);
const cwd = process.cwd();
const wasm = resolveWasm(cwd);
const wasmtime = detectWasmtime();

if (!wasm) emit(opts, { ok: false, error: "wasm-echo.wasm tidak ditemukan; build dulu atau set AIMT_WASM" }, 1);
if (!wasmtime) emit(opts, { ok: false, error: "wasmtime tidak ditemukan di PATH" }, 1);

const r = await run(wasm, opts.args, opts.timeoutMs);
emit(opts, {
  ok: r.exit_code === 0 && !r.timed_out,
  backend: "wasm",
  profile: opts.profile,
  wasmtime,
  wasm,
  ...r,
}, r.exit_code === 0 ? 0 : 1);
