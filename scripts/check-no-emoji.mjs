// scripts/check-no-emoji.mjs
//
// Automated check to ensure zero emojis or text-symbol icons exist in src/.
// Exits with code 1 if any match is found.

import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve(process.cwd(), "src");

// Regex matching Unicode emoji ranges and forbidden text-symbol icons
const EMOJI_OR_SYMBOL_REGEX =
  /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50\u2705\u274C✓✕✗→←↓↗♡❤✿⏱⚠◷⌖⌕▦⋯⊘↻▲▼↩]/gu;

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx|css)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(SRC_DIR);
let totalViolations = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const matches = [...line.matchAll(EMOJI_OR_SYMBOL_REGEX)];
    if (matches.length > 0) {
      const symbols = matches.map((m) => m[0]).join(" ");
      const relPath = path.relative(process.cwd(), file);
      console.error(`${relPath}:${idx + 1} -> Found forbidden symbol(s): [${symbols}] in: ${line.trim()}`);
      totalViolations += matches.length;
    }
  });
}

if (totalViolations > 0) {
  console.error(`\nFound ${totalViolations} emoji/text-symbol violation(s) in src/.`);
  process.exit(1);
} else {
  console.log("Zero emojis or forbidden text-symbol icons found in src/.");
  process.exit(0);
}

