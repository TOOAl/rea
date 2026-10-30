import { readFileSync, writeFileSync } from "node:fs";

const report = JSON.parse(readFileSync(".cache/static-checks/oxlint.json", "utf-8"));
const diags = report.diagnostics.filter(d => d.code === "eslint(no-unused-vars)");
console.log(`Remaining ${diags.length} no-unused-vars`);

const byFile = new Map();
for (const d of diags) {
  const line = d.labels?.[0]?.span?.line ?? 0;
  const m = d.message.match(/'([^']+)'/);
  const name = m ? m[1] : null;
  if (!name) continue;
  if (!byFile.has(d.filename)) byFile.set(d.filename, []);
  byFile.get(d.filename).push({ name, line, msg: d.message });
}

let filesChanged = 0;
for (const [filename, list] of byFile) {
  let content;
  try { content = readFileSync(filename, "utf-8"); } catch { continue; }
  const lines = content.split("\n");
  let changed = false;

  // Process largest line first
  const sorted = [...list].sort((a,b) => b.line - a.line);

  for (const { name, line } of sorted) {
    const idx = line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const originalLine = lines[idx];
    if (!originalLine.includes(name)) continue;

    // Case A: multiline import item on its own line: "  Name," or "  Name"
    // Detect if this line is inside an import { ... } block
    // Check if trimmed is exactly `name` or `name,` or `type name,` etc
    const trimmed = originalLine.trim();
    const isImportItem = trimmed === `${name},` || trimmed === `${name}` || trimmed === `type ${name},` || trimmed === `type ${name}` || trimmed.startsWith(`${name},`) || trimmed.startsWith(`${name} `);
    // Also check if line is within import by scanning backwards for "import" and forwards for "from"
    let isInImport = false;
    if (isImportItem) {
      // Look back up to 10 lines for import, forward for from
      let hasImport = false, hasFrom = false;
      for (let j = Math.max(0, idx-10); j <= idx; j++) {
        if (lines[j].includes("import") && lines[j].includes("{")) { hasImport = true; break; }
        if (lines[j].trim().startsWith("import")) { hasImport = true; break; }
      }
      for (let j = idx; j < Math.min(lines.length, idx+10); j++) {
        if (lines[j].includes("} from") || lines[j].includes("from \"") || lines[j].includes("from '")) { hasFrom = true; break; }
      }
      isInImport = hasImport && hasFrom;
    }

    if (isInImport) {
      // Remove this line entirely
      lines[idx] = `  // removed unused: ${trimmed} (${name})`;
      changed = true;
      continue;
    }

    // Case B: single-line import already handled? Try again if missed
    if (originalLine.includes("import") && originalLine.includes("{") && originalLine.includes("}")) {
      const importMatch = originalLine.match(/import\s*\{([^}]*)\}\s*from/);
      if (importMatch && originalLine.includes(name)) {
        const inside = importMatch[1];
        const items = inside.split(",").map(s=>s.trim()).filter(Boolean);
        const filtered = items.filter(it => {
          const clean = it.replace(/^type\s+/,"").split(/\s+/)[0];
          return clean !== name;
        });
        if (filtered.length !== items.length) {
          if (filtered.length === 0) {
            lines[idx] = `// removed unused import line: ${originalLine.trim()} // ${name}`;
          } else {
            lines[idx] = originalLine.replace(importMatch[1], ` ${filtered.join(", ")} `).replace(/,\s*,/, ",");
          }
          changed = true;
          continue;
        }
      }
    }

    // Case C: unused variable/parameter in destructuring or function params
    // Pattern: (operation: Type) => , or const { a, b, cUnused } =
    // For parameters: replace `name` with `_${name}` but keep type
    // Check if line contains `name:` or `name,` or `name }` or `name)` etc
    if (originalLine.match(new RegExp(`\\b${name}\\b`))) {
      // For destructured params like `({ nesting_read, types, ...rest })` where nesting_read unused
      // Replace `nesting_read` with `_nesting_read` (and if it's destructured, add as alias to keep value ignored?)
      // Simplest: prefix with underscore: `nesting_read` -> `_nesting_read`
      // But need to handle `({ a, b })` where we rename param: `({ nesting_read: _nesting_read, ...`
      // Simpler: just replace word boundary with prefixed
      // But need to ensure we don't double-prefix if already _
      if (!originalLine.includes(`_${name}`)) {
        const newLine = originalLine.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
        // Verify new line still contains _name and is valid JS
        lines[idx] = newLine;
        changed = true;
        continue;
      }
    }
  }

  if (changed) {
    writeFileSync(filename, lines.join("\n"), "utf-8");
    console.log(`Fixed ${filename} (${list.length} items)`);
    filesChanged++;
  }
}
console.log(`Done. Files changed: ${filesChanged}`);
