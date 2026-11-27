#!/usr/bin/env node
/**
 * Makes the generated Prisma client (runtime "nodejs", src/generated/prisma) usable on Cloudflare
 * Workers without a second client. Run after every `prisma generate` (postinstall, db:generate,
 * cf:build do it).
 *
 * Why: the Node client compiles its query-compiler WebAssembly at runtime from base64
 * (`new WebAssembly.Module(bytes)`), which workerd forbids ("Wasm code generation disallowed by
 * embedder"). Workers can only use WebAssembly modules that are part of the uploaded bundle.
 *
 * What it does (idempotent; fails loudly if Prisma changes the generated shape):
 * 1. writes the exact same wasm bytes to src/generated/prisma/internal/query_compiler.wasm, which
 *    cloudflare/worker.ts imports (wrangler bundles it as a precompiled module);
 * 2. patches internal/class.ts so getQueryCompilerWasmModule() returns that precompiled module
 *    when the worker has published it on globalThis, and falls back to base64 otherwise (Node).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const internalDir = join(root, "src", "generated", "prisma", "internal");
const classFile = join(internalDir, "class.ts");
const MARKER = "/* job-hunter:workerd-wasm */";
const GLOBAL_KEY = 'Symbol.for("job-hunter.prisma-query-compiler-wasm")';

let source = readFileSync(classFile, "utf8");
const importMatch =
  /await import\("(@prisma\/client\/runtime\/query_compiler_[a-z]+_bg\.[a-z]+\.wasm-base64\.mjs)"\)/.exec(source);
if (!importMatch) {
  console.error(
    `prepare-prisma-workerd: could not find the wasm-base64 import in ${classFile}. Prisma's generated client changed; update this script.`,
  );
  process.exit(1);
}

// 1. Raw wasm next to the client (resolved from the generated client's own @prisma/client).
const require = createRequire(classFile);
const base64Module = await import(pathToFileURL(require.resolve(importMatch[1])).href);
writeFileSync(join(internalDir, "query_compiler.wasm"), Buffer.from(base64Module.wasm, "base64"));

// 2. Prefer the precompiled module when the Cloudflare worker provides it.
if (!source.includes(MARKER)) {
  const anchor = "getQueryCompilerWasmModule: async () => {";
  if (!source.includes(anchor)) {
    console.error(`prepare-prisma-workerd: "${anchor}" not found in ${classFile}. Update this script.`);
    process.exit(1);
  }
  source = source.replace(
    anchor,
    `${anchor}\n    ${MARKER}\n    const precompiled = (globalThis as Record<symbol, unknown>)[${GLOBAL_KEY}]\n    if (precompiled instanceof WebAssembly.Module) return precompiled\n`,
  );
  writeFileSync(classFile, source);
}
console.log("prepare-prisma-workerd: query_compiler.wasm written, client patched.");
