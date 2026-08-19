/**
 * Strips control characters and collapses excess whitespace from text that
 * will be interpolated into an LLM prompt.
 *
 * This is deliberately NOT a prompt-injection keyword blocklist: blocklists
 * are trivially bypassed (paraphrasing, encoding) and produce false
 * positives on legitimate CV/JD content (e.g. a CV that mentions "system
 * administrator" or "ignore stale caches"). The actual injection mitigation
 * lives in analyze-prompt.ts, which wraps this text in clearly delimited
 * tags and instructs the model to treat everything inside them as inert
 * data, never as instructions. This function only removes bytes that have
 * no legitimate purpose in prompt text and bounds the length.
 */

// Control characters other than newline and tab, built from escape
// sequences rather than literal bytes so the source file stays plain text.
const CONTROL_CHARS_EXCEPT_NEWLINE_TAB = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g",
);

export function sanitizeForPrompt(text: string, maxLength: number): string {
  const withoutControlChars = text.replace(CONTROL_CHARS_EXCEPT_NEWLINE_TAB, "");
  const collapsedBlankLines = withoutControlChars.replace(/\n{3,}/g, "\n\n");
  return collapsedBlankLines.trim().slice(0, maxLength);
}
