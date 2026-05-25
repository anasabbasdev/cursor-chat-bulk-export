# Cursor Chat Bulk Export

Export your **Cursor** chat, Composer, and Agent conversations to clean **Markdown** files — locally on your machine, read-only, no network uploads.

Works in **Visual Studio Code** and **Cursor** (VS Code–compatible).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Author:** [Anas Abbas](https://anas-code.com) · **Website:** [anas-code.com](https://anas-code.com) · **Publisher:** AnasAbbasCode

---

## Why this extension?

Cursor stores conversations in local SQLite databases under your user profile. There is no built-in “export all chats to Markdown” for a project. This extension:

- Finds conversations tied to your **current workspace**
- Lets you **pick which chats** to export
- Writes one `.md` file per conversation plus an **`INDEX.md`** summary
- Offers a **clean export** (no tool-call noise, no empty “thinking” stubs) or a **full raw** archive

---

## Features

| Feature | Description |
|--------|-------------|
| **Workspace-scoped discovery** | Matches chats via path, storage hash, and folder name (useful after moving `wamp` → `laragon`, etc.) |
| **Panel-based discovery** | Reads Cursor’s `composerChatViewPane` → `aichat.view` mapping so the list aligns with the UI better than path-only filters |
| **Multi-select export** | QuickPick: export all or a subset |
| **Deferred loading** | Fast scan first; message bodies load only for **selected** chats (important for multi‑GB databases) |
| **Clean export (default)** | Drops tool-only messages, thinking placeholders, and empty bubbles |
| **Large DB support** | Uses **sqlite3 CLI** when `globalStorage/state.vscdb` is over ~1.85 GB (sql.js limit) |
| **Diagnostics** | Schema scan, conversation discovery report, raw candidate inspector |
| **Safe** | Read-only DB access; never modifies Cursor data |

---

## Requirements

- **VS Code** `^1.85.0` or **Cursor** (compatible host)
- **Windows / macOS / Linux** — Cursor (or VS Code) with existing local chat data
- For very large global databases (**~2 GB+** on Windows): [**SQLite CLI**](https://www.sqlite.org/download.html) on `PATH`, or `sqlite3.exe` beside the extension `out/` folder (see [Large databases](#large-databases-over-2-gb))

---

## Important — do not use v0.1.0

**Version `0.1.0` has known critical issues** (broken discovery on newer Cursor installs, unreliable exports). **Do not install or stay on 0.1.0.**

| Use instead | Notes |
|-------------|--------|
| **`0.1.2` or newer** | Current recommended release ([Open VSX](https://open-vsx.org/extension/AnasAbbasCode/cursor-chat-bulk-export) · [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=AnasAbbasCode.cursor-chat-bulk-export)) |
| **`0.1.1`** | Includes major discovery fixes; upgrade to `0.1.2+` when available |

**If you already have 0.1.0 installed**

1. Extensions → **Cursor Chat Bulk Export** → **⋯** → **Install Specific Version…** → choose **`0.1.2`** (or latest).
2. Or download the `.vsix` from the [Open VSX download page](https://open-vsx.org/extension/AnasAbbasCode/cursor-chat-bulk-export) → **Install from VSIX…** → reload the window.

**In Cursor:** the extension detail page may still show `0.1.0` as “current” while a newer version is already listed under **Install Specific Version** — that is a known Cursor marketplace cache delay, not a sign that the fix is unpublished.

The publisher may remove `0.1.0` from Open VSX so new installs cannot select it. Users who already downloaded it must update manually (steps above).

---

## Installation

### From VS Code Marketplace / Open VSX

1. Open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **Cursor Chat Bulk Export**
3. Click **Install**
4. Reload the window if prompted

### From a `.vsix` file

1. Download or build `cursor-chat-bulk-export-0.1.0.vsix`
2. In VS Code/Cursor: **Extensions** → `...` → **Install from VSIX...**
3. Select the file and reload

### Build from source (developers)

```bash
git clone https://github.com/anasabbasdev/cursor-chat-bulk-export.git
cd cursor-chat-bulk-export
npm install
npm run compile
```

Press **F5** to open an Extension Development Host with the extension loaded.

Package a VSIX:

```bash
npx @vscode/vsce package
```

---

## Quick start

1. Open the **workspace folder** whose chats you want (the same folder you use in Cursor).
2. `Ctrl+Shift+P` / `Cmd+Shift+P` → **Cursor Chat Bulk Export: Export Current Workspace Chats**
3. Wait for **Scanning Cursor storage…** (usually seconds; headers only).
4. Select conversations (Space to toggle, Enter to confirm).
5. Choose **Clean export** (recommended) or **Full raw export**.
6. Wait for **Loading chat messages…** (only for selected chats; large chats can take 1–3 minutes each).
7. Files appear in **`.cursor-chat-export/`** in your project root.

Open the folder: **Cursor Chat Bulk Export: Open Export Folder**.

---

## Commands

| Command | What it does |
|---------|----------------|
| **Export Current Workspace Chats** | Discover chats for the open workspace → pick → export to `.cursor-chat-export/` |
| **Export All Detected Workspace Chats** | Scan all workspaces in Cursor storage → pick workspace → pick chats → export |
| **Open Export Folder** | Reveal `.cursor-chat-export/` in the file manager |
| **Diagnose Current Workspace Chat Schema** | Log ItemTable keys and sample values for the current workspace DB |
| **Diagnose Conversation Discovery** | Full discovery report (counts, DB sizes, mismatch hints); optional UI count comparison |
| **Raw Discovery Mode** | Inspect every discovery candidate (parsed or not) in the Output channel |

All commands are available from the Command Palette.

---

## Export workflow (scan → pick → load → write)

```text
Scan (fast)     →  QuickPick      →  Load messages   →  Write .md
metadata only      your selection     selected only      + INDEX.md
```

- **Scan** does not load every bubble in a 2 GB database — only titles, IDs, and estimated message counts.
- **Load** runs per selected conversation and fetches only bubbles referenced in `composerData` headers (not every historical `bubbleId` row).

Progress messages:

- `Scanning Cursor storage…`
- `Loading chat messages… 3/10: <chat title>`
- `Exporting conversations…`

---

## Clean export vs full raw export

### Clean export *(recommended, default)*

Produces a compact, LLM-friendly transcript:

- **User** and **assistant** text kept
- **Tool-only lines removed** (e.g. `` `tool_…` ``, `` `call_…` ``)
- **Thinking-only placeholders removed** (`**Thinking**`, `Thinking...`, etc.)
- **Empty messages skipped**

Good for backups, documentation, or pasting context into a new chat.

### Full raw export

Includes tool calls, thinking blocks, and empty messages — useful for debugging or complete archival.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `cursorChatExport.includePossibleWorkspaceMatches` | `true` | Match by **folder name** when the full path changed (e.g. `c:\wamp64\www\MyApp` vs `c:\laragon\www\MyApp`) |
| `cursorChatExport.cursorUserDataPath` | `""` | Optional path to a **copy** of Cursor’s `User` folder (see below) |

**Settings JSON example:**

```json
{
  "cursorChatExport.includePossibleWorkspaceMatches": true,
  "cursorChatExport.cursorUserDataPath": ""
}
```

### Using a copied Cursor folder (diagnostics / migration)

If you copied `%APPDATA%\Cursor\User` from another PC (e.g. `D:\Cursor\User`) **only for inspection**, set:

```json
"cursorChatExport.cursorUserDataPath": "D:\\Cursor\\User"
```

Or set environment variable `CURSOR_APPDATA` to the parent of `User` (the folder that contains `User\globalStorage` and `User\workspaceStorage`).

**Normal export** should use the **live** Cursor data on the machine where you run Cursor, not a stale copy — otherwise chats won’t match what you see in the UI.

Expected layout:

```text
User/
├── globalStorage/
│   └── state.vscdb          ← main DB (composerData, bubbleId); often 1–3+ GB
└── workspaceStorage/
    └── <hash>/
        ├── workspace.json
        └── state.vscdb      ← per-workspace UI / panel metadata
```

---

## Output format

```text
.cursor-chat-export/
├── INDEX.md
├── diagnostics/
│   └── conversation-discovery-report.md   ← after Diagnose Conversation Discovery
├── 2026-05-24__fix-login-session-error.md
├── 2026-05-24__docker-erp-setup.md
└── 2026-05-24__untitled-chat-03.md
```

**Per-conversation file:**

```markdown
# Fix login session error

- **Workspace:** C:\Projects\MyApp
- **Exported at:** 2026-05-24T19:00:00.000Z
- **Original date:** 2026-05-23T14:32:11.000Z
- **Session type:** composer
- **Messages:** 28
- **Filtered internal messages:** 64
- **Source:** Cursor local chat storage

---

## User

How do I fix the session expiry bug in auth.ts?

---

## Assistant

The issue is in the `refreshToken` function…
```

**INDEX.md** lists each file with exported vs filtered counts and role breakdowns.

---

## How discovery works (short)

Cursor splits data across:

1. **`globalStorage/state.vscdb`** — table `cursorDiskKV`: `composerData:<id>` (metadata + message headers), `bubbleId:<composerId>:<bubbleId>` (message text).
2. **`workspaceStorage/<hash>/state.vscdb`** — table `ItemTable`: UI state, including `workbench.panel.composerChatViewPane.<tabId>` whose JSON points to `workbench.panel.aichat.view.<composerId>`.

The extension:

1. Resolves workspace storage hashes for your folder path (and optional folder-name match).
2. Collects composer IDs from workspace panel keys.
3. Loads matching `composerData` from global storage (SQL scope + direct ID lookup).
4. On export, loads only bubbles listed in each composer’s headers.

---

## Large databases (over ~2 GB)

`globalStorage/state.vscdb` can exceed **2 GB**. Built-in **sql.js** cannot open files that large; the extension switches to the **sqlite3** command-line tool automatically.

### Windows setup

1. Install SQLite (one of):
   - `winget install SQLite.SQLite`
   - [sqlite-tools-win-x64.zip](https://www.sqlite.org/download.html) → extract `sqlite3.exe`
2. Either add `sqlite3` to **PATH**, **or** copy `sqlite3.exe` next to the extension bundle:
   - Development: `MDCursorExporter/out/sqlite3.exe`
   - Installed: `%USERPROFILE%\.cursor\extensions\anasabbascode.cursor-chat-bulk-export-<version>\out\sqlite3.exe`
   - Same pattern under `%USERPROFILE%\.vscode\extensions\` if installed in VS Code

Confirm in **Output → Cursor Chat Bulk Export**: `Opened DB via cli`.

---

## Troubleshooting

### Output channel

**View → Output** → **Cursor Chat Bulk Export**. Run any command; logs appear here.

### UI shows more chats than export finds

Run **Diagnose Conversation Discovery**. Optionally enter how many chats Cursor’s UI shows (e.g. `48`).

Report path: `.cursor-chat-export/diagnostics/conversation-discovery-report.md`

| Case | Meaning |
|------|---------|
| **A** | Very few candidates — discovery incomplete |
| **B** | Many candidates, few parsed — parser gap |
| **C** | Many parsed, few after dedupe — duplicate IDs |
| **D** | Many global composers, few match workspace — path/hash filter |
| **OK** | Export count close to your UI hint |

**Raw Discovery Mode** shows each candidate key and whether it parsed.

### Chat stuck on “Loading chat” in Cursor (never finishes)

That usually means **no full local copy** of the conversation (cloud/synced or never downloaded). The extension **cannot export** chats that Cursor itself cannot open. Titles may still appear in the list from workspace metadata.

Try: same account, internet, open the chat once on the old machine, wait for sync, then export again.

### Export is slow

Expected for large histories:

- **Scan**: seconds (metadata only).
- **Load**: depends on selected chats; a chat with hundreds of messages may take **1–3+ minutes** on a 2 GB DB.
- **Write Markdown**: usually seconds.

Export **fewer chats at a time** if needed.

### No conversations found

1. Run **Diagnose Current Workspace Chat Schema** and **Diagnose Conversation Discovery**.
2. Ensure the correct workspace folder is open.
3. On large DBs, install **sqlite3** (see above).
4. Set `cursorChatExport.includePossibleWorkspaceMatches` to `true` if the project path moved.

### Stack overflow / crash on diagnose (old versions)

Current builds use a **light scan** on huge DBs (counts + samples, not full key enumeration). Update to the latest VSIX if you still see `Maximum call stack size exceeded`.

---

## Architecture

```text
src/
├── extension.ts                 Activate / register commands
├── logger.ts                    Output channel logger
├── types.ts                     Conversation, ExportOptions, etc.
├── storage/
│   ├── cursorStorage.ts         Resolve Cursor User path (APPDATA / settings)
│   ├── cursorDiskKV.ts          composerData + bubbleId (header-scoped load)
│   ├── workspaceScanner.ts      workspaceStorage scan + primary entry selection
│   ├── sqliteReader.ts          sql.js (WASM) for smaller DBs
│   ├── sqliteCliReader.ts       sqlite3 CLI for DBs ≥ ~1.85 GB
│   └── dbBackend.ts             Unified DB backend (sqljs | cli)
├── workspace/
│   └── workspaceMatch.ts        Path / hash / folder-name matching
├── chat/
│   ├── chatParser.ts            composerData + bubbles → Conversation
│   ├── itemTableDiscovery.ts    Panel keys + ChatSessionStore index
│   ├── schemaDiscovery.ts       ItemTable chat key heuristics
│   └── legacyParser.ts          Older ItemTable-only format
├── discovery/
│   ├── conversationDiscovery.ts Scan, defer load, hydrate for export
│   ├── discoveryReport.ts       Markdown diagnostic report
│   ├── lightDbScan.ts           Safe large-DB sampling
│   └── dedupeConversations.ts   Merge duplicate IDs
├── export/
│   ├── exportFilter.ts          Clean vs raw filtering
│   ├── markdownExporter.ts      Conversation → .md
│   ├── filenameSanitizer.ts     Safe Windows filenames
│   └── indexGenerator.ts        INDEX.md
└── ui/
    └── commands.ts                Command Palette + QuickPick pipeline
```

---

## Known limitations

- **Undocumented Cursor schema** — may change between Cursor versions; use Diagnose commands after upgrades.
- **Cloud-only / NAL chats** — `composerData` may exist with `isNAL: true` while bubbles are missing locally; export shows placeholders or skips empty chats.
- **Chats that never load in Cursor** — not recoverable from local SQLite alone.
- **Performance** — very large `state.vscdb` + many long chats: export can take tens of minutes; select subsets.
- **Workspace association** — matching uses path, hash, and folder name heuristics; not 100% identical to Cursor’s UI in every edge case.

---

## Privacy & safety

- **Read-only** access to Cursor databases (sql.js or sqlite3 `-readonly`).
- **No network** calls; nothing is sent to third parties.
- **No writes** to Cursor storage; export files go only under your project’s `.cursor-chat-export/`.
- Existing `.md` files are not overwritten — a numeric suffix is added (`name-2.md`).

---

## Contributing & support

- **Website:** [anas-code.com](https://anas-code.com)
- **Repository:** [github.com/anasabbasdev/cursor-chat-bulk-export](https://github.com/anasabbasdev/cursor-chat-bulk-export)
- **Issues:** [github.com/anasabbasdev/cursor-chat-bulk-export/issues](https://github.com/anasabbasdev/cursor-chat-bulk-export/issues)

---

## License

[MIT](LICENSE) — Copyright (c) 2026 [Anas Abbas](https://anas-code.com)
