// Ukrainian plurals need `_few` and `_many`, which English never uses.
type UkrainianOnlyKey = `${string}_${'few' | 'many'}`;

/** The shape of a catalog in another language, checked against the Ukrainian source. */
export type Translation<Source> = {
  -readonly [
    Key in keyof Source as Key extends UkrainianOnlyKey ? never : Key
  ]: Source[Key] extends string ? string : Translation<Source[Key]>;
};
