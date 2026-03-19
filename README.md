# move-files-up

> CLI tool to move all files in a directory one level up into the parent folder — supports dry-run, recursive mode, collision auto-renaming, and optional empty directory cleanup.

## How It Works

Given a directory called `summer` inside `photos`:

```
photos/
  summer/
    beach.jpg
    sunset.png
```

Running the tool produces:

```
photos/
  beach.jpg
  sunset.png
  summer/        ← removed if --delete-empty is used
```

All files are moved from the target directory into its parent folder.

---

## Requirements

- [Node.js](https://nodejs.org/) v14 or higher
- No external dependencies — uses only built-in `fs` and `path` modules

---

## Usage

```bash
node move-files-up.js <directory> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview all moves without making any changes |
| `--recursive` | Also move files from subdirectories one level up |
| `--delete-empty` | Remove the source directory if it is empty after moving |
| `--help` | Show usage information |

### Examples

```bash
# Move all files in ./photos/summer up into ./photos
node move-files-up.js ./photos/summer

# Preview what would be moved (no changes made)
node move-files-up.js ./photos/summer --dry-run

# Move files and delete the folder if it ends up empty
node move-files-up.js ./photos/summer --delete-empty

# Move files from all subdirectories too
node move-files-up.js ./photos/summer --recursive
```

---

## Safeguards

- **Dry-run mode** — preview every move before committing with `--dry-run`
- **Collision auto-renaming** — if a file with the same name already exists in the parent, it is automatically renamed to `filename_1.ext`, `filename_2.ext`, etc. rather than overwriting
- **Cross-device support** — if `fs.rename` fails (e.g. moving across drives or partitions), the tool automatically falls back to copy + delete
- **Root guard** — prevents running on a filesystem root directory
- **Exit code** — exits with code `1` if any errors occur, making it safe to use in scripts and CI pipelines

---

## License

MIT
