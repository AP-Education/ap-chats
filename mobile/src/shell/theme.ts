// Mirrors the light palette of @ap-education/ui's theme. Screens beside the page follow
// the person's theme through features/appearance instead.
export const colors = {
  primary: '#0c7d77',
  primaryBg: '#e6f4f3',
  primaryBgHover: '#d2ebe8',
  primaryBorder: '#9fcfc9',
  text: '#1f2f2d',
  textSecondary: '#5b716e',
  border: '#bcd5d2',
  surface: '#ffffff',
} as const;

export const gradient = ['#f3f9f8', '#e7f2f1', '#ddedec', '#cee5e4'] as const;

export const radius = { sm: 8, md: 12, lg: 20 } as const;

// 4pt-based scale — pick from here instead of ad-hoc numbers so spacing stays consistent.
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
