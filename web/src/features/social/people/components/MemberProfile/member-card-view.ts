/** What the card shows: the profile, or on a phone the role list that replaces it in the sheet. */
export type MemberCardView = 'profile' | 'roles';

export type MemberCardAction = { type: 'manageRoles' } | { type: 'backToProfile' };

export function memberCardView(_view: MemberCardView, action: MemberCardAction): MemberCardView {
  switch (action.type) {
    case 'manageRoles':
      return 'roles';
    case 'backToProfile':
      return 'profile';
  }
}
