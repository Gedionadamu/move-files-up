#!/usr/bin/env node

/**
 * move-files-up.js
 * Moves all files in a directory one level up (into the parent directory).
 *
 * Usage:
 *   node move-files-up.js <directory>
 *   node move-files-up.js <directory> --dry-run       (preview without moving)
 *   node move-files-up.js <directory> --recursive     (move files from all subdirs too)
 *   node move-files-up.js <directory> --delete-empty  (remove dir if empty after move)
 */

const fs = require("fs");
const path = require("path");

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node move-files-up.js <directory> [options]

Options:
  --dry-run       Preview moves without making any changes
  --recursive     Also move files from subdirectories one level up
  --delete-empty  Delete the source directory if it is empty after moving
  --help          Show this help message

Example:
  node move-files-up.js ./photos/summer
  node move-files-up.js ./photos/summer --dry-run
  node move-files-up.js ./photos/summer --delete-empty
`);
  process.exit(0);
}

const targetDir   = args.find((a) => !a.startsWith("--"));
const isDryRun    = args.includes("--dry-run");
const isRecursive = args.includes("--recursive");
const deleteEmpty = args.includes("--delete-empty");

// ── Validate directory ────────────────────────────────────────────────────────
const resolvedDir = path.resolve(targetDir);

if (!fs.existsSync(resolvedDir)) {
  console.error(`❌  Directory not found: ${resolvedDir}`);
  process.exit(1);
}

if (!fs.statSync(resolvedDir).isDirectory()) {
  console.error(`❌  Path is not a directory: ${resolvedDir}`);
  process.exit(1);
}

const parentDir = path.dirname(resolvedDir);

if (parentDir === resolvedDir) {
  console.error("❌  Already at the filesystem root — cannot move up.");
  process.exit(1);
}

// ── Counters ──────────────────────────────────────────────────────────────────
let moved   = 0;
let skipped = 0;
let errors  = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a safe destination path, appending _1, _2, … on collision.
 */
function safeDestPath(destDir, fileName) {
  let dest = path.join(destDir, fileName);
  if (!fs.existsSync(dest)) return dest;

  const ext  = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  do {
    dest = path.join(destDir, `${base}_${counter}${ext}`);
    counter++;
  } while (fs.existsSync(dest));
  return dest;
}

/**
 * Checks whether a directory has no files (optionally ignoring empty sub-dirs).
 */
function isEmpty(dirPath) {
  const entries = fs.readdirSync(dirPath);
  return entries.length === 0;
}

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Moves all files inside `srcDir` into `destDir`.
 */
function moveFilesUp(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      if (isRecursive) moveFilesUp(fullPath, destDir);
      continue;
    }

    if (!entry.isFile()) continue; // skip symlinks, etc.

    const dest = safeDestPath(destDir, entry.name);
    const displaySrc  = path.relative(process.cwd(), fullPath);
    const displayDest = path.relative(process.cwd(), dest);
    const renamed     = path.basename(dest) !== entry.name;

    if (isDryRun) {
      console.log(
        `🔍  [dry-run] ${displaySrc}  →  ${displayDest}` +
        (renamed ? "  ⚠️  (renamed to avoid collision)" : "")
      );
      moved++;
    } else {
      try {
        fs.renameSync(fullPath, dest);
        console.log(
          `✅  ${displaySrc}  →  ${displayDest}` +
          (renamed ? "  ⚠️  (renamed to avoid collision)" : "")
        );
        moved++;
      } catch (err) {
        // renameSync can fail across devices; fall back to copy + unlink
        try {
          fs.copyFileSync(fullPath, dest);
          fs.unlinkSync(fullPath);
          console.log(
            `✅  ${displaySrc}  →  ${displayDest}` +
            (renamed ? "  ⚠️  (renamed to avoid collision)" : "")
          );
          moved++;
        } catch (err2) {
          console.error(`❌  Failed to move "${entry.name}": ${err2.message}`);
          errors++;
        }
      }
    }
  }

  // Optionally remove the source dir if now empty
  if (deleteEmpty && !isDryRun && isEmpty(srcDir)) {
    try {
      fs.rmdirSync(srcDir);
      console.log(`🗑   Removed empty directory: ${path.relative(process.cwd(), srcDir)}`);
    } catch (err) {
      console.warn(`⚠️   Could not remove directory: ${err.message}`);
    }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\n📁  Source    : ${resolvedDir}`);
console.log(`📂  Dest      : ${parentDir}`);
console.log(`🏷   Mode      : ${isDryRun ? "dry-run (no changes)" : "live"}`);
console.log(`🔁  Recursive : ${isRecursive ? "yes" : "no"}`);
console.log(`🗑   Del empty : ${deleteEmpty ? "yes" : "no"}`);
console.log("─".repeat(55));

moveFilesUp(resolvedDir, parentDir);

console.log("─".repeat(55));
console.log(`\nDone.  Moved: ${moved}  |  Skipped: ${skipped}  |  Errors: ${errors}\n`);

if (errors > 0) process.exit(1);