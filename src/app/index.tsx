import { useRouter } from 'expo-router';
import { CalendarPlus, MapPin, Swords, Timer, Users, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { DemoBadge } from '@/components/DemoBadge';
import { Enter } from '@/components/Enter';
import { ErrorText } from '@/components/Field';
import { Mountain } from '@/components/Mountain';
import { Sticker } from '@/components/Sticker';
import { useReduceMotion } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { borderWidth, colors, fonts, iconStroke, radius, shadow, spacing, type } from '@/lib/theme';

const HEADLINE = 'Your gap between classes is a side quest.'.split(' ');

/** Example quests for the hero card. Written to sound like the real generator. */
const SAMPLES = [
  {
    pair: 'Maya and Noah',
    minutes: 40,
    spot: 'The AQ',
    title: 'The Concrete Critics',
    body: 'Find the most dramatic slab of concrete in the AQ. Give it a name, a star sign, and a one-star review. You both climb, so settle whether it would be a V2 or a V5.',
    proof: 'Both of you pointing at the slab like it owes you money.',
  },
  {
    pair: 'Priya and Chloe',
    minutes: 30,
    spot: 'Convocation Mall',
    title: 'Album Cover, No Budget',
    body: 'You are now a band. Name it and your debut album using only words on signs you can see from the mall steps, then shoot the cover on film or on a phone held like it is film.',
    proof: 'The album cover: both of you, deadly serious, in front of your backdrop.',
  },
  {
    pair: 'Arjun and Hana',
    minutes: 25,
    spot: 'The SUB',
    title: 'Opening Theory, Closing Snacks',
    body: 'Play one game of chess with whatever you can find on the table as pieces. Whoever loses names their king after the vending machine item they would least like to be.',
    proof: 'The final position, with the losing king clearly labelled.',
  },
  {
    pair: 'Ethan and Emily',
    minutes: 20,
    spot: 'Bennett Library steps',
    title: 'Bubble Tea Tier List',
    body: 'Rank every bubble tea topping from S tier to "should be illegal". You must agree on the whole list. Tapioca is not automatically S tier. Defend your positions.',
    proof: 'Both of you holding the finished tier list, one of you visibly unhappy about it.',
  },
];

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: CalendarPlus, title: 'Add your schedule', text: 'Upload a screenshot of your timetable. We read your classes and find the gaps.' },
  { icon: Users, title: 'Get matched', text: 'See who is free when you are and into the same things. Nobody ever sees your classes.' },
  { icon: Swords, title: 'Do the quest', text: 'Meet up, flip the card, and do the slightly unhinged thing it says. One photo proves it.' },
];

export default function Landing() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { user, loading, error } = useSession();
  const wide = width >= 900;

  // "How it works" animates in when it scrolls into view.
  const [stepsTop, setStepsTop] = useState<number | null>(null);
  const [stepsSeen, setStepsSeen] = useState(false);
  const checkSeen = (scrollY: number, top: number | null) => {
    if (top !== null && scrollY + height > top + 80) setStepsSeen(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        scrollEventThrottle={32}
        onScroll={(e) => {
          if (!stepsSeen) checkSeen(e.nativeEvent.contentOffset.y, stepsTop);
        }}>
        <View style={[styles.hero, wide && styles.heroWide]}>
          <View style={wide ? styles.heroText : undefined}>
            <Headline large={wide} />
            <Enter index={5}>
              <Text style={[type.body, styles.lede]}>
                SideQuest reads your SFU schedule, finds people who are free when you are, and hands you both something
                slightly unhinged to do together.
              </Text>
            </Enter>

            <Enter index={6} style={styles.actions}>
              {loading ? null : user ? (
                <>
                  <Button size="lg" label="Open my week" onPress={() => router.push('/home')} />
                  <View style={styles.signedIn}>
                    <Text style={[type.small, styles.fog]}>
                      Signed in as {user.name}, {user.campus}
                    </Text>
                    <DemoBadge name={user.name} />
                  </View>
                </>
              ) : (
                <View style={styles.authButtons}>
                  <Button size="lg" label="Sign up" onPress={() => router.push('/onboarding')} />
                  <Button size="lg" variant="secondary" label="Sign in" onPress={() => router.push('/sign-in')} />
                </View>
              )}
              {error ? <ErrorText>{error}</ErrorText> : null}
            </Enter>
          </View>

          <Enter index={4} style={wide ? styles.heroCard : styles.heroCardNarrow}>
            <SampleQuest />
          </Enter>
        </View>

        <Mountain height={wide ? 140 : 90} />

        <View
          style={styles.how}
          onLayout={(e: LayoutChangeEvent) => {
            const top = e.nativeEvent.layout.y;
            setStepsTop(top);
            checkSeen(0, top); // already on screen on tall windows
          }}>
          <View style={styles.howInner}>
            <Text style={type.title}>How it works</Text>
            <View style={[styles.steps, wide && styles.stepsWide]}>
              {STEPS.map((step, i) => {
                const card = (
                  <View style={[styles.step, shadow.hard]}>
                    <View style={styles.stepIcon}>
                      <step.icon size={34} color={colors.white} strokeWidth={iconStroke} />
                    </View>
                    <Text style={styles.stepNumber}>Step {i + 1}</Text>
                    <Text style={type.heading}>{step.title}</Text>
                    <Text style={[type.body, styles.fog]}>{step.text}</Text>
                  </View>
                );
                return stepsSeen ? (
                  <Enter key={step.title} index={i * 2} style={wide ? styles.flex : undefined}>
                    {card}
                  </Enter>
                ) : (
                  // Hold the space, invisible, until the section scrolls into view.
                  <View key={step.title} style={[wide ? styles.flex : undefined, styles.hidden]}>
                    {card}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The headline arrives one word at a time. */
function Headline({ large }: { large: boolean }) {
  const reduce = useReduceMotion();
  const progress = useRef(HEADLINE.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduce) {
      progress.forEach((p) => p.setValue(1));
      return;
    }
    Animated.stagger(
      70,
      progress.map((p) => Animated.timing(p, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
    ).start();
  }, [reduce, progress]);

  return (
    <View style={styles.headline} accessibilityRole="header" accessibilityLabel={HEADLINE.join(' ')}>
      {HEADLINE.map((word, i) => (
        <Animated.Text
          key={i}
          accessibilityElementsHidden
          style={[
            type.hero,
            large && styles.heroLarge,
            // "side quest." gets the SFU red
            i >= HEADLINE.length - 2 && { color: colors.primary },
            { opacity: progress[i], transform: [{ translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
          ]}>
          {word}{' '}
        </Animated.Text>
      ))}
    </View>
  );
}

/**
 * The hero quest card. It flips through example quests every few seconds,
 * and on a computer it tilts toward the cursor.
 */
function SampleQuest() {
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const flip = useRef(new Animated.Value(0)).current; // 0 = facing us, 1 = edge-on
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) return; // no auto-flipping for people who asked for less motion
    const timer = setInterval(() => {
      Animated.timing(flip, { toValue: 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % SAMPLES.length);
        Animated.timing(flip, { toValue: 0, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
      });
    }, 5200);
    return () => clearInterval(timer);
  }, [reduce, flip]);

  // Web only: lean toward the cursor, up to 7 degrees each way.
  const hover =
    Platform.OS === 'web' && !reduce
      ? {
          onPointerMove: (e: { nativeEvent: { clientX: number; clientY: number }; currentTarget: unknown }) => {
            // Measure against the card's own box so hovering its text does not make it jitter.
            const box = (e.currentTarget as { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number } })
              .getBoundingClientRect?.();
            if (!box || !box.width || !box.height) return;
            const px = (e.nativeEvent.clientX - box.left) / box.width - 0.5;
            const py = (e.nativeEvent.clientY - box.top) / box.height - 0.5;
            tiltY.setValue(px * 14);
            tiltX.setValue(-py * 14);
          },
          onPointerLeave: () => {
            Animated.spring(tiltX, { toValue: 0, friction: 6, useNativeDriver: true }).start();
            Animated.spring(tiltY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
          },
        }
      : {};

  const quest = SAMPLES[index];
  const deg = (v: Animated.Value, range: number) => v.interpolate({ inputRange: [-range, range], outputRange: [`-${range}deg`, `${range}deg`] });

  return (
    <View {...hover}>
      <Animated.View
        accessibilityLabel={`Sample quest for ${quest.pair}: ${quest.title}. ${quest.body}`}
        style={[
          styles.sample,
          shadow.hard,
          {
            transform: [
              { perspective: 900 },
              { rotateZ: '-1.5deg' },
              { rotateX: deg(tiltX, 7) },
              { rotateY: Animated.add(tiltY, flip.interpolate({ inputRange: [0, 1], outputRange: [0, 90] })).interpolate({ inputRange: [-97, 97], outputRange: ['-97deg', '97deg'] }) },
            ],
          },
        ]}>
        <View style={styles.stickers} pointerEvents="none">
          <Sticker icon={Timer} label={`${quest.minutes} min`} tilt={-4} tone="ink" />
          <Sticker icon={MapPin} label={quest.spot} tilt={2} />
          <Sticker icon={Users} label={quest.pair} tilt={-2} tone="red" />
        </View>
        <Text style={styles.sampleTitle}>{quest.title}</Text>
        <Text style={type.body}>{quest.body}</Text>
        <View style={styles.proof} pointerEvents="none">
          <Text style={type.small}>Photo proof: {quest.proof}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  hidden: { opacity: 0 },
  scroll: { backgroundColor: colors.chalk },
  page: { flexGrow: 1 },
  fog: { color: colors.fog },

  hero: { padding: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xxl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  heroWide: { flexDirection: 'row', alignItems: 'center', maxWidth: 1080, paddingVertical: 72, gap: 56 },
  heroText: { flex: 1.1 },
  heroCard: { flex: 1 },
  heroCardNarrow: { marginTop: spacing.sm },
  headline: { flexDirection: 'row', flexWrap: 'wrap' },
  heroLarge: { fontSize: 68, lineHeight: 70, letterSpacing: -2 },
  lede: { marginTop: spacing.lg, color: colors.fog, fontSize: 18, lineHeight: 27, maxWidth: 520 },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  signedIn: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  authButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  sample: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    backgroundColor: colors.quest,
  },
  stickers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sampleTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.5, color: colors.ink },
  proof: { borderWidth, borderColor: colors.ink, borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.md },

  how: { backgroundColor: colors.paper, borderTopWidth: borderWidth, borderTopColor: colors.ink },
  howInner: { padding: spacing.xl, paddingVertical: spacing.xxl * 1.5, gap: spacing.xl, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  steps: { gap: spacing.lg },
  stepsWide: { flexDirection: 'row' },
  step: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    backgroundColor: colors.chalk,
  },
  stepIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-4deg' }],
  },
  stepNumber: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
});
