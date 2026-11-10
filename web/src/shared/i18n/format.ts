function perLocale<Format>(create: (locale: string) => Format): (locale: string) => Format {
  const formats = new Map<string, Format>();

  return (locale) => {
    const known = formats.get(locale);
    if (known) return known;

    const format = create(locale);
    formats.set(locale, format);
    return format;
  };
}

/** Built once per language on first use, so a list of rows never constructs a formatter per row. */
export function dateTimeFormat(options: Intl.DateTimeFormatOptions) {
  return perLocale((locale) => new Intl.DateTimeFormat(locale, options));
}

export function numberFormat(options?: Intl.NumberFormatOptions) {
  return perLocale((locale) => new Intl.NumberFormat(locale, options));
}
