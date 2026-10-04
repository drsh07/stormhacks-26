import { useRouter } from 'expo-router';
import { Clock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { firstName } from '@/lib/people';
import { borderWidth, colors, iconStroke, radius, spacing, type } from '@/lib/theme';
import { formatDate } from '@/lib/time';
import type { EventFeedItem } from '@/lib/types';

import { Button } from './Button';
import { Card } from './Card';
import { DemoBadge } from './DemoBadge';
import { ErrorText } from './Field';

/** One event from the feed, with the people you match who are also free then. */
export function EventCard({ event }: { event: EventFeedItem }) {
  const router = useRouter();
  const [goingWith, setGoingWith] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** "Go with someone": sends that person a meetup invite for this event. */
  async function goWith(personId: string) {
    setGoingWith(personId);
    setError(null);
    try {
      const res = await api<{ meetup_id: string }>('/api/meetups', {
        method: 'POST',
        body: { receiver_id: personId, event_id: event.id },
      });
      router.push(`/meetup/${res.meetup_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that invite. Try again.");
    } finally {
      setGoingWith(null);
    }
  }

  return (
    <Card>
      <View style={styles.when}>
        <Clock size={16} color={colors.white} strokeWidth={iconStroke} />
        <Text style={[type.bodyStrong, { color: colors.white }]}>
          {event.day}, {formatDate(event.date)}, {event.start_time} to {event.end_time}
        </Text>
      </View>
      <Text style={type.heading}>{event.title}</Text>
      <View style={styles.meta}>
        <MapPin size={16} color={colors.fog} strokeWidth={iconStroke} />
        <Text style={[type.small, styles.fog, styles.flex]}>
          {event.location}
          {event.campus ? `, ${event.campus}` : ''}
        </Text>
      </View>
      <Text style={type.body}>{event.description}</Text>
      <Text style={[type.small, styles.fog]}>
        {event.is_mine ? 'You are hosting this' : `Hosted by ${event.host.avatar_emoji} ${event.host.name}`}
      </Text>

      <View style={styles.people}>
        <Text style={type.bodyStrong}>Go with someone</Text>
        {event.people.length === 0 ? (
          <Text style={[type.small, styles.fog]}>None of your matches are free then yet.</Text>
        ) : (
          event.people.map((person) => (
            <View key={person.id} style={styles.person}>
              <View style={styles.personName}>
                <Text style={type.body} numberOfLines={1}>
                  {person.avatar_emoji} {person.name}
                </Text>
                <DemoBadge name={person.name} />
              </View>
              <Button
                label={`Go with ${firstName(person.name)}`}
                size="sm"
                onPress={() => goWith(person.id)}
                loading={goingWith === person.id}
                disabled={goingWith !== null}
              />
            </View>
          ))
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fog: { color: colors.fog },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  people: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: borderWidth,
    borderTopColor: colors.muted,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
