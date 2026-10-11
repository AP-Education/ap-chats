import type { MessageReaction, Reactor } from './types';

export const MAX_FACES = 3;

const plural = new Intl.PluralRules('uk-UA');
const REACTION_NOUN: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'реакція',
  few: 'реакції',
  many: 'реакцій',
};
const compactCount = new Intl.NumberFormat('uk-UA', { notation: 'compact' });

export interface PersonReactions {
  memberId: string;
  name: string;
  avatarPath: string | null;
  emojis: string[];
}

export function totalReactions(reactions: MessageReaction[] = []) {
  return reactions.reduce((total, reaction) => total + reaction.count, 0);
}

export function reactionsLabel(total: number) {
  return `${total} ${REACTION_NOUN[plural.select(total)] ?? 'реакції'}`;
}

export function chipCount(count: number) {
  return compactCount.format(count);
}

export function chipLabel({ emoji, count, reacted }: MessageReaction) {
  return reacted ? `${emoji} ${count}, ваша реакція` : `${emoji} ${count}`;
}

/** A few people read better as faces, but only once every one of them is known. */
export function chipFaces<Member>(
  reaction: MessageReaction,
  findMember: (memberId: string) => Member | undefined,
): Member[] | null {
  const fewPeople = reaction.count <= MAX_FACES;
  const allListed = reaction.recentMemberIds.length === reaction.count;
  if (!fewPeople || !allListed) return null;

  const faces = reaction.recentMemberIds.map(findMember);
  return faces.every((member) => member !== undefined) ? faces : null;
}

/** One entry per person, in the order of their latest reaction, with every emoji they used. */
export function reactionsByPerson(reactors: Reactor[]): PersonReactions[] {
  const people = new Map<string, PersonReactions>();

  for (const reactor of reactors) {
    const person = people.get(reactor.memberId) ?? {
      memberId: reactor.memberId,
      name: reactor.displayName ?? 'Ім’я недоступне',
      avatarPath: reactor.avatarPath,
      emojis: [],
    };
    person.emojis.push(reactor.emoji);
    people.set(reactor.memberId, person);
  }

  return [...people.values()];
}
