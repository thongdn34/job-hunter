import { describe, expect, it } from "vitest";
import ts from "typescript";
import { isbCoding } from "./coding";

/**
 * Executes the exact solution code shown in Section 9 (and any alternative that defines the
 * same function) against every test case. Also type-checks each snippet in strict mode so the
 * displayed TypeScript compiles as written.
 */

type AnyFn = (...args: unknown[]) => unknown;

function loadFunction(code: string, functionName: string): AnyFn {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const cjsModule: { exports: Record<string, unknown> } = { exports: {} };
  const evaluate = new Function(
    "exports",
    "module",
    outputText +
      "\nreturn typeof " +
      functionName +
      " === 'function' ? " +
      functionName +
      " : module.exports[" +
      JSON.stringify(functionName) +
      "];",
  ) as (exports: Record<string, unknown>, module: { exports: Record<string, unknown> }) => unknown;
  const fn = evaluate(cjsModule.exports, cjsModule);
  if (typeof fn !== "function") throw new Error(functionName + " is not defined by the solution code");
  return fn as AnyFn;
}

/** Strict type-check of in-memory snippets (each its own module) against the default libs. */
function typeCheck(files: Record<string, string>): string[] {
  const options: ts.CompilerOptions = {
    strict: true,
    noUncheckedIndexedAccess: true,
    noUnusedLocals: true,
    noImplicitReturns: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseFileExists = host.fileExists.bind(host);
  const baseReadFile = host.readFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    fileName in files
      ? ts.createSourceFile(fileName, files[fileName] ?? "", languageVersion, true)
      : baseGetSourceFile(fileName, languageVersion, ...rest);
  host.fileExists = (fileName) => fileName in files || baseFileExists(fileName);
  host.readFile = (fileName) => files[fileName] ?? baseReadFile(fileName);
  const program = ts.createProgram(Object.keys(files), options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => (d.file ? d.file.fileName + ": " : "") + ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

const defines = (code: string, name: string) => new RegExp("\\bfunction\\s+" + name + "\\b").test(code);

const runnable = isbCoding.flatMap((exercise) => {
  const variants = [{ label: "solution", code: exercise.solution.code }];
  const alt = exercise.alternative?.code?.code;
  if (alt && defines(alt, exercise.functionName)) variants.push({ label: "alternative", code: alt });
  return variants.map((v) => ({
    exercise,
    ...v,
    title: exercise.id + " " + exercise.functionName + " (" + v.label + ")",
  }));
});

describe("ISB coding solutions (executed)", () => {
  it("has five exercises whose solution defines functionName", () => {
    expect(isbCoding).toHaveLength(5);
    for (const c of isbCoding) {
      expect(defines(c.solution.code, c.functionName), c.id).toBe(true);
      expect(c.solution.language).toBe("ts");
      expect(c.followUp.id).toBe(c.id + "-f1");
      expect(c.testCases.length).toBeGreaterThanOrEqual(4);
      expect(c.steps.length).toBeGreaterThanOrEqual(4);
      expect(c.steps.length).toBeLessThanOrEqual(8);
      for (const t of c.testCases) expect(JSON.parse(JSON.stringify(t))).toEqual(t); // JSON-serialisable
    }
  });

  it("type-checks every displayed snippet in strict mode", () => {
    const files = Object.fromEntries(runnable.map((r, i) => ["/snippets/" + r.exercise.id + "-" + i + ".ts", r.code]));
    expect(typeCheck(files)).toEqual([]);
  }, 30_000);

  describe.each(runnable)("$title", ({ exercise, code }) => {
    const fn = loadFunction(code, exercise.functionName);
    it.each(exercise.testCases)("$name", ({ args, expected }) => {
      const input = JSON.parse(JSON.stringify(args)) as unknown[]; // never let the solution mutate fixtures
      expect(fn(...input)).toEqual(expected);
    });
  });
});
