const BARE_LINK = /https?:\/\/[^\s<>]+/g;
const ESCAPE = /\\([!-/:-@[-`{-~])/g;

/**
 * Messages stored before the server kept text as typed carry Markdown escapes inside bare links
 * (`a\_b`), which no real URL contains and which break the link; this reads them back as typed.
 */
export function withoutLinkEscapes(markdown: string): string {
  return markdown.replace(BARE_LINK, (link) => link.replace(ESCAPE, '$1'));
}
