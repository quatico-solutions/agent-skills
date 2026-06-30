/**
 * generate-coverage.ts — Post-processor for bash xtrace coverage
 *
 * Reads .xtrace.log (produced by bash -x with BASH_XTRACEFD),
 * counts hits per line in bin/bb, classifies lines as executable
 * or non-executable, and outputs:
 *   - coverage/.resultset.json  (SimpleCov-compatible)
 *   - coverage/index.html       (standalone line-by-line report)
 *   - text summary to stdout
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const testsDir = resolve(__dirname, "../..");
const skillRoot = resolve(testsDir, "..");
const bbPath = resolve(skillRoot, "bin/bb");
const xtraceLog = resolve(testsDir, ".xtrace.log");
const coverageDir = resolve(skillRoot, "coverage");

// --- Step 1: Parse xtrace log and count hits per line ---

const hitCounts = new Map<number, number>();

if (!existsSync(xtraceLog)) {
  console.error("error: .xtrace.log not found — did you run tests with coverage?");
  process.exit(1);
}

const logContent = readFileSync(xtraceLog, "utf-8");
// Match lines like: +/path/to/bin/bb:42: <command>
// The PS4 format is: +${BASH_SOURCE}:${LINENO}:
const tracePattern = /^\+[^:]*\/bin\/bb:(\d+): /gm;
let match: RegExpExecArray | null;
while ((match = tracePattern.exec(logContent)) !== null) {
  const line = parseInt(match[1], 10);
  hitCounts.set(line, (hitCounts.get(line) ?? 0) + 1);
}

// --- Step 2: Read bb source and classify lines ---

const bbSource = readFileSync(bbPath, "utf-8");
const bbLines = bbSource.split("\n");

// Track heredoc state
let inHeredoc = false;
let heredocEnd = "";

function isNonExecutable(line: string, _lineNum: number): boolean {
  const trimmed = line.trim();

  // Heredoc content tracking
  if (inHeredoc) {
    if (trimmed === heredocEnd) {
      inHeredoc = false;
    }
    return true;
  }

  // Detect heredoc start — look for <<'EOF' or <<EOF or <<-'EOF' etc.
  const heredocMatch = trimmed.match(/<<-?\s*'?(\w+)'?\s*$/);
  if (heredocMatch) {
    inHeredoc = true;
    heredocEnd = heredocMatch[1];
    // The line starting the heredoc IS executable (it's a command)
    return false;
  }

  // Empty lines
  if (trimmed === "") return true;

  // Comments (but not shebangs on line 1 — those are also non-executable)
  if (trimmed.startsWith("#")) return true;

  // Closing keywords
  if (/^(fi|done|esac|else|then|do|\}|;;|\))$/.test(trimmed)) return true;

  // Function definitions: name() {  or  function name {
  if (/^\w[\w_]*\s*\(\)\s*\{?\s*$/.test(trimmed)) return true;
  if (/^function\s+\w[\w_]*\s*\{?\s*$/.test(trimmed)) return true;

  // Lone opening brace
  if (trimmed === "{") return true;

  // Case patterns: word) or word|word) — but not commands containing )
  if (/^[\w*|"'\s-]+\)$/.test(trimmed)) return true;

  return false;
}

type CoverageEntry = number | null; // null = non-executable, 0 = missed, N = hit count

const coverage: CoverageEntry[] = bbLines.map((line, i) => {
  const lineNum = i + 1;
  if (isNonExecutable(line, lineNum)) return null;
  return hitCounts.get(lineNum) ?? 0;
});

// --- Step 3: Write coverage/.resultset.json ---

mkdirSync(coverageDir, { recursive: true });

const resultSet = {
  "bb-xtrace": {
    coverage: {
      [bbPath]: {
        lines: coverage,
      },
    },
    timestamp: Math.floor(Date.now() / 1000),
  },
};

writeFileSync(
  resolve(coverageDir, ".resultset.json"),
  JSON.stringify(resultSet, null, 2) + "\n"
);

// --- Step 4: Generate coverage/index.html ---

const executableLines = coverage.filter((c) => c !== null);
const coveredLines = executableLines.filter((c) => (c as number) > 0);
const missedLines = executableLines.filter((c) => c === 0);
const percentage =
  executableLines.length > 0
    ? ((coveredLines.length / executableLines.length) * 100).toFixed(1)
    : "0.0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const htmlLines = bbLines
  .map((line, i) => {
    const cov = coverage[i];
    const lineNum = i + 1;
    let cls: string;
    let badge: string;

    if (cov === null) {
      cls = "non-exec";
      badge = "   ";
    } else if (cov === 0) {
      cls = "missed";
      badge = " 0x";
    } else {
      cls = "covered";
      const countStr = String(cov);
      badge = countStr.length > 3 ? "999x" : countStr.padStart(3, " ") + "x";
    }

    return `<tr class="${cls}"><td class="ln">${lineNum}</td><td class="ct">${badge}</td><td class="code"><pre>${escapeHtml(line)}</pre></td></tr>`;
  })
  .join("\n");

const pctNum = parseFloat(percentage);
const pctColor = pctNum >= 80 ? "#4caf50" : pctNum >= 50 ? "#ff9800" : "#f44336";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>bb coverage — ${percentage}%</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #e0e0e0; }
  h1 { font-size: 1.4em; margin-bottom: 4px; }
  .summary { margin-bottom: 16px; font-size: 0.95em; color: #aaa; }
  .summary .pct { font-weight: bold; color: ${pctColor}; font-size: 1.1em; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  td { padding: 0; vertical-align: top; }
  td.ln { text-align: right; padding-right: 8px; color: #666; user-select: none; width: 3em; font-family: monospace; }
  td.ct { text-align: right; padding-right: 8px; color: #888; user-select: none; width: 3em; font-family: monospace; font-size: 11px; }
  td.code pre { margin: 0; white-space: pre; font-family: 'SF Mono', 'Fira Code', monospace; tab-size: 2; }
  tr.covered td.code { background: rgba(76, 175, 80, 0.15); }
  tr.missed td.code { background: rgba(244, 67, 54, 0.2); }
  tr.covered td.ct { color: #4caf50; }
  tr.missed td.ct { color: #f44336; font-weight: bold; }
  tr:hover td { background: rgba(255,255,255,0.05); }
</style>
</head>
<body>
<h1>bin/bb coverage</h1>
<div class="summary">
  <span class="pct">${percentage}%</span> covered —
  ${coveredLines.length} / ${executableLines.length} lines hit,
  ${missedLines.length} missed,
  ${bbLines.length} total
</div>
<table>
${htmlLines}
</table>
</body>
</html>
`;

writeFileSync(resolve(coverageDir, "index.html"), html);

// --- Step 5: Print text summary ---

const bar = "\u2500".repeat(60);
console.log();
console.log(bar);
console.log("  bb coverage: " + percentage + "%");
console.log("  " + coveredLines.length + " / " + executableLines.length + " executable lines covered");
console.log("  " + missedLines.length + " lines missed");
console.log("  Report: coverage/index.html");
console.log(bar);
console.log();
