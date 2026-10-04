/**
 * SideQuest design tokens. Change a value here and the whole app follows.
 * SFU theme: SFU red for actions, off-white page, near-black outlines.
 * Quest yellow is reserved for quest cards only (the RPG "!" marker).
 */
export const colors = {
  ink: '#16130F',
  chalk: '#F6F2EA',
  paper: '#FFFFFF',
  /** SFU red. */
  primary: '#CC0633',
  quest: '#FFCE1F',
  /** Errors. Burnt orange, so an error never looks like a red SFU button. */
  coral: '#B8400A',
  moss: '#1B7F57',
  fog: '#625C52',
  muted: '#E8E2D6',
  white: '#FFFFFF',
} as const;

/** Names match the fonts loaded in src/app/_layout.tsx. */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 18 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const borderWidth = 2;

/** Every icon uses a 2px stroke to match the 2px borders. */
export const iconStroke = 2;

/** The signature move: a hard, offset "sticker" shadow. No blur. */
export const shadow = {
  hard: { boxShadow: `4px 4px 0px 0px ${colors.ink}` },
  hardSm: { boxShadow: `2px 2px 0px 0px ${colors.ink}` },
  /** Hover: the element lifts, so the shadow grows. */
  hardLift: { boxShadow: `4px 4px 0px 0px ${colors.ink}` },
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
