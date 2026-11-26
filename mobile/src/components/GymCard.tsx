import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Gym } from '../types/gym';

export function formatDistance(meters: number | undefined): string | null {
  if (meters == null) return null;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function priceLabel(gym: Gym): string | null {
  if (gym.pricePerMonth != null) return `₱${gym.pricePerMonth.toLocaleString('en-PH')}/mo`;
  if (gym.pricePerSession != null) return `₱${gym.pricePerSession.toLocaleString('en-PH')}/session`;
  return null;
}

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
  /** "compact" is the swipeable card shown over the map. */
  variant?: 'list' | 'compact';
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function GymCard({
  gym,
  onPress,
  variant = 'list',
  selected = false,
  style,
}: GymCardProps) {
  const locality = [gym.barangay, gym.city].filter(Boolean).join(', ');
  const address = gym.address || locality || 'Address not listed';
  const distance = formatDistance(gym.distanceMeters);
  const price = priceLabel(gym);
  const compact = variant === 'compact';
  const tags = gym.is24Hours
    ? ['24hrs', ...gym.amenities.filter((amenity) => amenity !== '24hrs')]
    : gym.amenities;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${gym.name}${distance ? `, ${distance} away` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compactCard : styles.listCard,
        selected && styles.selectedCard,
        pressed && styles.pressed,
        style,
      ]}
    >
      {gym.image ? (
        <Image source={{ uri: gym.image }} style={[styles.thumb, compact && styles.compactThumb]} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, compact && styles.compactThumb]}>
          <Ionicons name="barbell" size={compact ? 24 : 28} color="#E11D2E" />
        </View>
      )}

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>
          {gym.name}
        </Text>

        <View style={styles.inlineRow}>
          <Ionicons name="location-outline" size={13} color="#6b7781" />
          <Text numberOfLines={1} style={styles.address}>
            {address}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={11} color="#C8102E" />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          )}
          {gym.rating != null && (
            <View style={styles.inlineRow}>
              <Ionicons name="star" size={12} color="#d99a1e" />
              <Text style={styles.rating}>{gym.rating.toFixed(1)}</Text>
            </View>
          )}
          {price && <Text style={styles.price}>{price}</Text>}
        </View>

        {!compact && tags.length > 0 && (
          <View style={styles.tags}>
            {tags.slice(0, 4).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#a4aeb5" style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#fff',
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  listCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  compactCard: {
    paddingVertical: 10,
  },
  selectedCard: {
    borderColor: '#E11D2E',
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#e8edf0',
  },
  compactThumb: {
    width: 58,
    height: 58,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  name: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  address: {
    flexShrink: 1,
    color: '#697580',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FDECEE',
  },
  distanceText: {
    color: '#C8102E',
    fontSize: 11,
    fontWeight: '800',
  },
  rating: {
    color: '#8a5d10',
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    color: '#1A1A1D',
    fontSize: 12,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#F3F3F5',
  },
  tagText: {
    color: '#4A4A52',
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 6,
  },
});
