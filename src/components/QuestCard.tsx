import { Camera, MapPin, Sparkles, Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, fonts, iconStroke, radius, shadow, spacing, type } from '@/lib/theme';
import type { Quest } from '@/lib/types';

import { Button } from './Button';
import { Sticker } from './Sticker';

interface Props {
  quest: Quest;
  /** False shows the face-down card with a "Reveal" button. */
  revealed: boolean;
  onReveal: () => void;
  /** Where the pair is meeting. Shown as a sticker. */
  spot?: string;
  /** Shown as a sticker: "First meetup" quests are mandatory, later ones are a bonus. */
  kind?: 'First meetup' | 'Bonus quest';
}

/**
 * The quest-log card. Face down at first; revealing it flips the card over.
 * The flip is two halves: turn edge-on, swap the face, turn back.
 */
export function QuestCard({ quest, revealed, onReveal, spot, kind }: Props) {
  const turn = useRef(new Animated.Value(0)).current; // 0 = facing us, 1 = edge-on
  const [flipping, setFlipping] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  function reveal() {
    if (reduceMotion) return onReveal();
    setFlipping(true);
    Animated.timing(turn, { toValue: 1, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      onReveal();
      Animated.timing(turn, { toValue: 0, duration: 420, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start(() =>
        setFlipping(false),
      );
    });
  }

  const rotateY = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <Animated.View style={[styles.card, shadow.hard, { transform: [{ perspective: 900 }, { rotateY }] }]}>
      {revealed ? (
        <>
          <View style={styles.stickers}>
            <Sticker icon={Timer} label={`${quest.time_estimate_min} min`} tilt={-4} tone="ink" />
            {spot ? <Sticker icon={MapPin} label={spot} tilt={2} /> : null}
            {kind ? <Sticker icon={Sparkles} label={kind} tilt={-2} tone="red" /> : null}
          </View>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={type.body}>{quest.body}</Text>
          {quest.why_it_fits ? <Text style={[type.small, styles.why]}>Why you two: {quest.why_it_fits}</Text> : null}
          <View style={styles.proof}>
            <View style={styles.proofHead}>
              <Camera size={16} color={colors.ink} strokeWidth={iconStroke} />
              <Text style={type.bodyStrong}>Photo proof</Text>
            </View>
            <Text style={type.small}>{quest.photo_proof_instruction}</Text>
          </View>
        </>
      ) : (
        <View style={styles.faceDown}>
          <Text style={styles.mark}>!</Text>
          <Text style={[styles.title, styles.centerText]}>A side quest awaits</Text>
          <Text style={[type.body, styles.centerText]}>Made for the two of you. No peeking until you are ready.</Text>
          <Button label="Reveal the quest" variant="secondary" size="lg" onPress={reveal} disabled={flipping} style={styles.center} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.quest,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  stickers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 2 },
  proofHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.5, color: colors.ink },
  why: { fontStyle: 'italic' },
  proof: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: 2,
  },
  faceDown: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  mark: { fontFamily: fonts.display, fontSize: 96, lineHeight: 100, color: colors.ink },
  centerText: { textAlign: 'center' },
  center: { alignSelf: 'center' },
});
