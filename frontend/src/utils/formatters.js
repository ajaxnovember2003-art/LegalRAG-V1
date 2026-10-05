/**
 * Formatting utilities for LegalRAG frontend.
 *
 * These helpers format backend data for display.
 * They never invent data — if a field is missing,
 * they return null or a safe fallback.
 */

/**
 * Map source filenames to human-readable act names.
 */
const SOURCE_NAMES = {
  'BNS2023.pdf': 'Bharatiya Nyaya Sanhita (BNS), 2023',
  '250884_2_english_01042024.pdf': 'Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023',
  '250882_english_01042024_0.pdf': 'Bharatiya Sakshya Adhiniyam (BSA), 2023',
  'BNSS.pdf': 'Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023',
  'BSA.pdf': 'Bharatiya Sakshya Adhiniyam (BSA), 2023',
};

const SOURCE_SHORT = {
  'BNS2023.pdf': 'BNS 2023',
  '250884_2_english_01042024.pdf': 'BNSS 2023',
  '250882_english_01042024_0.pdf': 'BSA 2023',
  'BNSS.pdf': 'BNSS 2023',
  'BSA.pdf': 'BSA 2023',
};

export function formatSourceName(filename) {
  if (!filename) return 'Official Statutory Gazette';
  return SOURCE_NAMES[filename] || filename;
}

export function formatSourceShort(filename) {
  if (!filename) return 'Statute';
  return SOURCE_SHORT[filename] || filename;
}


/**
 * Format page range text from a source object.
 */
export function formatPageRange(source) {
  const start = source.page_start ?? source.page;
  const end = source.page_end ?? source.page;

  if (start == null) return null;
  if (start === end || end == null) return `Page ${start}`;
  return `Pages ${start}–${end}`;
}

/**
 * Format a rerank score for display (0 to 1 scale).
 */
export function formatScore(score) {
  if (score == null) return null;
  return score.toFixed(4);
}

/**
 * Format a relative timestamp.
 */
export function formatTimeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncateText(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}
