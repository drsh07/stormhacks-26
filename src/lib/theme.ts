/**
 * SideQuest design tokens. Change a value here and the whole app follows.
 * Palette: cool chalk screen, white cards, ink outlines, cobalt for actions,
 * quest yellow reserved for quests only (the RPG "!" marker).
 */
export const colors = {
  ink: '#16182D',
  chalk: '#EEF1F6',
  paper: '#FFFFFF',
  cobalt: '#2340E0',
  quest: '#FFCE1F',
  coral: '#E5432F',
  moss: '#1B8F61',
  fog: '#5D627A',
  muted: '#DFE4EE',
  white: '#FFFFFF',
} as const;

/** Names match the fonts loaded in src/app/_layout.tsx. */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
} as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 18 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const borderWidth = 2;

/** The one signature move: a hard, offset "sticker" shadow. No blur. */
export const shadow = {
  hard: { boxShadow: `4px 4px 0px 0px ${colors.ink}` },
  hardSm: { boxShadow: `2px 2px 0px 0px ${colors.ink}` },
  none: { boxShadow: `0px 0px 0px 0px ${colors.ink}` },
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.5, color: colors.ink },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19, color: colors.ink },
} as const;
