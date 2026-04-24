#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/solve-cli.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);

// src/state.ts
var treeFilename = (id) => `solve_tree_${id}.json`;
function isSettled(sol, nodes) {
  if (sol.status === "resolved" || sol.status === "failed") return true;
  return Object.values(nodes).some(
    (n) => n.type === "problem" && n.parent_solution === sol.id && n.status === "blocked"
  );
}

// src/solve-cli.ts
var [, , mode, session, cwd] = process.argv;
if (!mode || !session || !cwd) {
  process.stderr.write(`Usage: solve-cli validate <solve_id> <cwd>
`);
  process.exit(1);
}
var treeFile = path.join(cwd, ".claude", treeFilename(session));
if (mode === "validate") {
  if (!fs.existsSync(treeFile)) process.exit(0);
  const state = JSON.parse(fs.readFileSync(treeFile, "utf8"));
  if (state.status !== "solving") process.exit(0);
  const { nodes } = state;
  const solutions = Object.values(nodes).filter((n) => n.type === "solution").sort((a, b) => a.id.localeCompare(b.id, void 0, { numeric: true }));
  const open = solutions.filter((n) => !isSettled(n, nodes)).map((n) => `${n.id} (${n.status})`).join(", ");
  const treeLines = solutions.length ? solutions.map((n) => {
    const depth = (n.id.match(/\./g) ?? []).length;
    return `${"  ".repeat(depth + 1)}${n.id} [${n.status}]`;
  }).join("\n") : "  (no solutions declared yet)";
  const msg = [
    `Open solutions: ${open || "none declared"}.`,
    `
Current tree:
${treeLines}`,
    `
Use the solve MCP tools to continue: solve_declare, solve_research, solve_resolve, or solve_block.`
  ].join("\n");
  process.stdout.write(msg + "\n");
  process.exit(1);
}
process.stderr.write(`Unknown mode: ${mode}
`);
process.exit(1);
