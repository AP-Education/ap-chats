// Ported from front-LMS's shared/ui/Avatar/utils/color: deterministic
// color per name so the same entity always gets the same fallback tile.
export const avatarColors = [
  { bg: '#FFE4E0', text: '#D64545' },
  { bg: '#FFEFD5', text: '#B76B00' },
  { bg: '#FFFACD', text: '#A89C00' },
  { bg: '#E8F9E9', text: '#1F9D37' },
  { bg: '#E3F2FD', text: '#2467C6' },
  { bg: '#EDE7FD', text: '#6B4AD3' },
  { bg: '#FCE7FF', text: '#B43BC7' },
];

export function getAvatarColor(name: string) {
  const index = simpleHash(name) % avatarColors.length;
  return avatarColors[index];
}

function simpleHash(str?: string): number {
  let hash = 0;
  if (!str) return hash;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
