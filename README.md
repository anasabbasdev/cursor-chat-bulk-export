# Cursor Chat Bulk Export

A VS Code / Cursor extension that exports your Cursor chat, composer, and agent conversation history to Markdown files — entirely locally, no network calls, no data leaves your machine.

---

## Features

- Scans Cursor's local SQLite databases (`globalStorage/state.vscdb`, `cursorDiskKV` table)
- Lists all conversations belonging to the currently open workspace
- Multi-select QuickPick UI — choose individual conversations or all at once
- **Clean export by default** — removes internal noise (tool calls, thinking blocks, empty messages)
- Exports each conversation as a standalone `.md` file
- Generates an `INDEX.md` summary file with per-conversation stats
- Handles missing attachments/blobs gracefully (placeholder instead of crash)
- Sanitises filenames for Windows
- Never modifies Cursor's internal databases (read-only access)

---

## Clean Export vs Full Raw Export

After selecting conversations, the extension asks you to choose an export mode:

### Clean export *(recommended, default)*

Produces a compact, LLM-friendly Markdown transcript:

- **User messages** — preserved as-is
- **Assistant messages** — preserved as-is (explanations, code, answers)
- **Tool call noise removed** — messages whose content is only an internal ID like `` `tool_e21919a9-...` `` or `` `call_xxxxx` `` are silently dropped
- **Thinking placeholders removed** — assistant messages that contain only `**Thinking**`, `*Thinking*`, `Thinking...`, etc. are dropped
- **Empty messages removed** — whitespace-only or separator-only content is skipped

The result is clean, readable, and easy to paste back into a new chat as context.

### Full raw export

Everything is included verbatim — tool calls, thinking blocks, empty messages. Useful for debugging the parser or archiving every internal Cursor event.

---

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9

### 1. Install dependencies

```bash
cd path/to/MDCursorExporter
npm install
```

### 2. Build

```bash
npm run build
```

Or start the file watcher:

```bash
npm run watch
```

### 3. Run in VS Code / Cursor

Press **F5** in the extension project to launch an Extension Development Host window with the extension loaded.

---

## Usage

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

### `Cursor Chat Bulk Export: Export Current Workspace Chats`

1. Detects the currently open workspace folder
2. Locates all matching Cursor conversations in `globalStorage`
3. Shows a multi-select list of conversations found
4. Asks: **Clean export** or **Full raw export**
5. Exports selected conversations to `.cursor-chat-export/` in your project root

### `Cursor Chat Bulk Export: Export All Detected Workspace Chats`

1. Scans **all** workspace storage entries (not just the current one)
2. Lets you pick a workspace
3. Then pick conversations
4. Asks: **Clean export** or **Full raw export**
5. Exports to `.cursor-chat-export/` in the active project

### `Cursor Chat Bulk Export: Open Export Folder`

Opens `.cursor-chat-export/` in your OS file manager.

### `Cursor Chat Bulk Export: Diagnose Current Workspace Chat Schema`

Scans the current workspace's storage and prints detailed schema diagnostics to the Output Channel. Useful if conversations are not being found.

---

## Output Format

```
.cursor-chat-export/
├── INDEX.md
├── 2026-05-24__fix-login-session-error.md
├── 2026-05-24__docker-erp-setup.md
└── 2026-05-24__untitled-chat-03.md
```

Each conversation file looks like:

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

---
```

The `INDEX.md` shows per-conversation stats:

```markdown
- [`2026-05-24__fix-login-session.md`](./2026-05-24__fix-login-session.md) — **Fix login session error** — 2026-05-24
  - Messages exported: 28, Internal filtered: 64
  - Roles: User 12, Assistant 16
```

---

## Debugging

If conversations are not found, open the **Cursor Chat Bulk Export** Output Channel:

- **View → Output** → select **Cursor Chat Bulk Export** from the dropdown

Then run **Diagnose Current Workspace Chat Schema** for detailed per-conversation diagnostics.

---

## Architecture

```
src/
├── extension.ts              Entry point — activate/deactivate
├── logger.ts                 OutputChannel-backed logger
├── types.ts                  Shared TypeScript interfaces + ExportOptions
├── storage/
│   ├── cursorStorage.ts      Locate Cursor user-data directory (cross-platform)
│   ├── cursorDiskKV.ts       Read composerData + bubbleId records from globalStorage
│   ├── workspaceScanner.ts   Scan & match workspaceStorage entries
│   └── sqliteReader.ts       Open & query state.vscdb read-only (sql.js / WASM)
├── chat/
│   ├── schemaDiscovery.ts    Heuristic key filtering + schema logging
│   ├── chatParser.ts         composerData → Conversation (current Cursor schema)
│   └── legacyParser.ts       ItemTable-based parser (older Cursor versions)
├── export/
│   ├── exportFilter.ts       shouldExportMessage + isToolCallOnly + isThinkingOnly
│   ├── filenameSanitizer.ts  Windows-safe filename generation
│   ├── markdownExporter.ts   Render Conversation → Markdown (with filtering)
│   └── indexGenerator.ts     Write INDEX.md with filtered/visible counts
└── ui/
    └── commands.ts           Register commands + QuickPick + export pipeline
```

---

## Known Limitations

- **Schema changes** — Cursor's internal storage format is undocumented and may change between versions. Run the Diagnose command to inspect what's in your database.
- **Large databases** — Very large chat histories may take a few seconds to parse. A progress indicator is shown.
- **Workspace matching** — Conversations are matched to your workspace by URI path and storage hash. If you moved a project, some conversations may not be associated automatically.

---

## Safety

- Opens all Cursor databases with read-only access via `sql.js` (pure WASM — no native compilation needed).
- Never deletes any files.
- Never uploads data anywhere.
- If an export file already exists, a numeric suffix is added (`filename-2.md`) rather than overwriting.

---

## License

MIT
