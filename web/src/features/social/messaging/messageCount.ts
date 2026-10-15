const plural = new Intl.PluralRules('uk');

/** How many messages, in words: "1 повідомлення", "3 повідомлення", "5 повідомлень". */
export function messageCount(count: number): string {
  const noun = plural.select(count) === 'many' ? 'повідомлень' : 'повідомлення';
  return `${count} ${noun}`;
}
