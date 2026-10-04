import { Clock, MapPin } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, iconStroke, radius, spacing, type } from '@/lib/theme';
import { formatDuration } from '@/lib/time';
import type { Match } from '@/lib/types';

import { Button } from './Button';
import { Card } from './Card';
import { DemoBadge } from './DemoBadge';

const YEAR_LABEL = ['', '1st year', '2nd year', '3rd year', '4th year'];
/** How far (px) a card must be dragged sideways to count as a swipe. */
const SWIPE_DISTANCE = 110;

interface Props {
  match: Match;
  /** Tap "Propose meetup", or swipe the card right. */
  onPropose?: () => void;
  /** Swipe the card left to skip this person for now. */
  onSkip?: () => void;
}

/**
 * One person you could meet: who they are, when you are both free, and why
 * you matched. Drag it right to propose, left to skip; let go early and it
 * springs back. The button does the same as a right swipe, so nothing needs a gesture.
 */
export function MatchCard({ match, onPropose, onSkip }: Props) {
  const { user, overlap, why } = match;
  const year = YEAR_LABEL[user.year] ?? `${user.year}th year`;
  const about = [user.program, year].filter(Boolean).join(', ');

  const x = useRef(new Animated.Value(0)).current;
  // Keep the latest callbacks without rebuilding the gesture handler.
  const handlers = useRef({ onPropose, onSkip });
  useEffect(() => {
    handlers.current = { onPropose, onSkip };
  }, [onPropose, onSkip]);

  const pan = useRef(
    PanResponder.create({
      // Only take over for a clearly sideways drag, so vertical scrolling still works.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const { onPropose: propose, onSkip: skip } = handlers.current;
        const springBack = () => Animated.spring(x, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start();
        if (g.dx > SWIPE_DISTANCE && propose) {
          springBack();
          propose();
        } else if (g.dx < -SWIPE_DISTANCE && skip) {
          Animated.timing(x, { toValue: -500, duration: 180, useNativeDriver: true }).start(() => skip());
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start(),
    }),
  ).current;

  const swipeable = !!onPropose || !!onSkip;
  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-6deg', '0deg', '6deg'] });

  return (
    <Animated.View style={{ transform: [{ translateX: x }, { rotate }] }} {...(swipeable ? pan.panHandlers : {})}>
      <Card>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.emoji}>{user.avatar_emoji}</Text>
          </View>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text style={type.heading}>{user.name}</Text>
              <DemoBadge name={user.name} />
            </View>
            {about ? <Text style={[type.small, styles.fog]}>{about}</Text> : null}
          </View>
        </View>

        <View style={[styles.block, overlap.on_campus && styles.blockGap]}>
          <View style={styles.line}>
            <Clock size={16} color={overlap.on_campus ? colors.white : colors.ink} strokeWidth={iconStroke} />
            <Text style={[type.bodyStrong, overlap.on_campus && { color: colors.white }]}>
              {overlap.day} {overlap.start_time} to {overlap.end_time}, {formatDuration(overlap.minutes)}
            </Text>
          </View>
          <View style={styles.line}>
            <MapPin size={16} color={overlap.on_campus ? colors.white : colors.fog} strokeWidth={iconStroke} />
            <Text style={[type.small, overlap.on_campus ? { color: colors.white } : styles.fog]}>{overlap.campus} campus</Text>
          </View>
        </View>

        <Text style={type.small}>{why}</Text>
        {onPropose && <Button label="Propose meetup" onPress={onPropose} />}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fog: { color: colors.fog },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: 26,
    backgroundColor: colors.chalk,
  },
  emoji: { fontSize: 26 },
  block: {
    gap: 4,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.chalk,
  },
  blockGap: { backgroundColor: colors.primary },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
