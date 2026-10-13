const collator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true });

/** Orders names as a Ukrainian reader expects, which the database's collation may not. */
export const compareNames = collator.compare;
