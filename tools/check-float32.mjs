#!/usr/bin/env node
/**
 * check-float32 — enforces the float32 narrowing convention (task 1.12).
 *
 * Java model fields are `float`; TS `number` is double. Every place a numeric
 * value enters a model/io object field, the code must apply f32() so geometry
 * and serialization stay bit-compatible with the Java implementation
 * (docs/05-file-format.md §2, packages/core/src/util/f32.ts).
 *
 * Rule: in packages/core/src/model and packages/core/src/io, any assignment
 * `this.field = <expr>` where the expression is numeric must contain an
 * f32(...) call, unless the field is known to be non-numeric (string/boolean/
 * object) or the RHS is a literal/constant the Java side stores verbatim.
 *
 * Usage: node tools/check-float32.mjs [--fix]   (--fix not yet supported)
 * Exit code 1 on violations; wired into CI.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["packages/core/src/model", "packages/core/src/io"];

function collectTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function isNumericType(type) {
  const t = type.replace(/\[\]$/, "");
  return ["number", "float", "double", "int", "long", "short", "byte"].includes(t);
}

let violations = 0;

for (const dir of SCAN_DIRS) {
  const absDir = join(ROOT, dir);
  const files = collectTsFiles(absDir);
  for (const file of files) {
    const sourceText = readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const hasF32Import = sourceText.includes("f32");
    // Collect numeric parameter names per method for heuristic typing.
    const numericParams = new Set();
    function collectNumericParams(node) {
      if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isConstructorDeclaration(node)) {
        for (const param of node.parameters) {
          const name = param.name;
          const typeText = param.type ? param.type.getText(sourceFile) : "";
          if (ts.isIdentifier(name) && isNumericType(typeText)) {
            numericParams.add(name.text);
          }
        }
      }
      ts.forEachChild(node, collectNumericParams);
    }
    collectNumericParams(sourceFile);
    // Walk class declarations for `this.x = ...` assignments.
    function visit(node) {
      if (ts.isPropertyAccessExpression(node)) {
        const parent = node.parent;
        if (
          parent &&
          ts.isBinaryExpression(parent) &&
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          parent.left === node &&
          node.expression.kind === ts.SyntaxKind.ThisKeyword
        ) {
          const fieldName = node.name.getText(sourceFile);
          const rhs = parent.right;
          const rhsText = rhs.getText(sourceFile);
          // Skip non-numeric-looking fields and object/list literals.
          const looksNumeric =
            /[0-9]/.test(rhsText) ||
            numericParams.has(rhsText) ||
            /(^|\W)(x|y|z|width|depth|height|elevation|angle|pitch|roll|thickness|radius|diameter|offset|scale|alpha|shininess|power|length|size|value|fieldOfView|yaw|latitude|longitude|northDirection|arcExtent|time|frameRate|speed|subpartSize|distance|margin|planScale)(\W|$)/.test(rhsText);
          if (!looksNumeric) return;
          const isLiteral = /^[-+]?[0-9.]+$/.test(rhsText) || rhs.kind === ts.SyntaxKind.NumericLiteral;
          // Literals are fine verbatim (they are exact float32 values).
          if (isLiteral) return;
          // Falsy booleanish values like `null`/`undefined`/`false` are fine.
          if (rhs.kind === ts.SyntaxKind.NullKeyword || rhs.kind === ts.SyntaxKind.TrueKeyword || rhs.kind === ts.SyntaxKind.FalseKeyword) {
            return;
          }
          const body = parent.parent;
          const statementText = body ? body.getText(sourceFile) : "";
          const hasF32 = rhsText.includes("f32(") || statementText.includes("f32(");
          if (!hasF32) {
            const typeOfRhs = numericParams.has(rhsText) ? "numeric parameter" : "numeric expression";
            violations += 1;
            console.log(`  ${file}: this.${fieldName} = ${rhsText} (${typeOfRhs}) — narrow with f32()`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    for (const stmt of sourceFile.statements) {
      visit(stmt);
    }
  }
}

if (violations > 0) {
  console.error(`\ncheck-float32: ${violations} violation(s). Apply f32() at every numeric narrowing point (see packages/core/src/util/f32.ts).`);
  process.exit(1);
} else {
  console.log("check-float32: OK — no un-narrowed numeric assignments in model/io.");
}
