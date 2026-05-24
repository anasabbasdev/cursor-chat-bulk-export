/**
 * Filename sanitizer for Windows-safe, readable export file names.
 */

/**
 * Windows reserved characters that must be removed from file names.
 * Also removes characters that are problematic in URLs and shell usage.
 */
const WINDOWS_ILLEGAL = /[\\/:*?"<>|]/g;

/** Characters that look odd in filenames (collapsed to hyphens) */
const COLLAPSE_TO_HYPHEN = /[\s_+,.;!@#$%^&()=[\]{}'`~]+/g;

/** Multiple consecutive hyphens → single hyphen */
const MULTI_HYPHEN = /-{2,}/g;

/** Leading/trailing hyphens */
const EDGE_HYPHEN = /^-+|-+$/g;

/**
 * Sanitizes a string for use as a Windows filename component.
 * - Removes illegal characters
 * - Replaces whitespace and separators with hyphens
 * - Lowercases the result
 * - Truncates to maxLen characters
 */
export function sanitizeFilenameSegment(input: string, maxLen = 80): string {
  return input
    .toLowerCase()
    .replace(WINDOWS_ILLEGAL, '')
    .replace(COLLAPSE_TO_HYPHEN, '-')
    .replace(MULTI_HYPHEN, '-')
    .replace(EDGE_HYPHEN, '')
    .slice(0, maxLen)
    .replace(EDGE_HYPHEN, ''); // trim again after slice
}

/**
 * Formats a Date (or ISO string) as `YYYY-MM-DD` for the filename prefix.
 */
export function formatDatePrefix(date: Date | string | null): string {
  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a sanitized filename (without extension) for a conversation.
 *
 * Format: `YYYY-MM-DD__<slug>`
 * Examples:
 *   2026-05-24__fix-login-session-error
 *   2026-05-24__untitled-chat-03
 */
export function buildConversationFilename(
  title: string | null,
  firstUserMessage: string | null,
  date: string | null,
  fallbackIndex: number
): string {
  const datePrefix = formatDatePrefix(date);

  let slug: string;
  if (title && title.trim()) {
    slug = sanitizeFilenameSegment(title.trim(), 80);
  } else if (firstUserMessage && firstUserMessage.trim()) {
    // Use first ~60 chars of first message as slug
    slug = sanitizeFilenameSegment(firstUserMessage.trim().slice(0, 60), 80);
  } else {
    slug = `untitled-chat-${String(fallbackIndex).padStart(2, '0')}`;
  }

  if (!slug) {
    slug = `untitled-chat-${String(fallbackIndex).padStart(2, '0')}`;
  }

  return `${datePrefix}__${slug}`;
}

/**
 * Given a desired filename and a Set of already-used filenames,
 * returns a unique filename by appending a numeric suffix if needed.
 *
 * @param baseName  Filename WITHOUT extension and WITHOUT suffix
 * @param usedNames  Set of already-used base names (without extension)
 * @param ext  Extension including the leading dot, default `.md`
 */
export function makeUniqueFilename(
  baseName: string,
  usedNames: Set<string>,
  ext = '.md'
): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName + ext;
  }
  for (let i = 2; i < 1000; i++) {
    const candidate = `${baseName}-${i}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate + ext;
    }
  }
  // Extremely unlikely; use timestamp as last resort
  const ts = Date.now().toString(36);
  const candidate = `${baseName}-${ts}`;
  usedNames.add(candidate);
  return candidate + ext;
}
