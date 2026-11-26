import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Gym } from '../types/gym';

function formatPrice(value: number | null, suffix: string): string {
  if (value == null) return 'Price not listed';
  return `₱${value.toLocaleString('en-PH')} ${suffix}`;
}

interface GymCardProps {
  gym: Gym;
  onPress: () => void;
}

export default function GymCard({ gym, onPress }: GymCardProps) {
  const coordinates = gym.location.coordinates;
  const locality = [gym.barangay, gym.city].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageFallback}>
        <Text style={styles.imageGlyph}>GYM</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.name}>
            {gym.name}
          </Text>
          <Text style={styles.rating}>
            {gym.rating == null ? '—' : gym.rating.toFixed(1)}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.address}>
          {gym.address || locality || 'Address not listed'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>
            {formatPrice(gym.pricePerMonth, '/ month')}
          </Text>
          {gym.distanceMeters != null && (
            <Text style={styles.distance}>
              {(gym.distanceMeters / 1000).toFixed(1)} km
            </Text>
          )}
        </View>
        <Text numberOfLines={1} style={styles.amenities}>
          {gym.amenities.length ? gym.amenities.join(' · ') : 'Amenities not listed'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#13221f',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  imageFallback: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#183d36',
  },
  imageGlyph: {
    color: '#d6f1e4',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    color: '#14211f',
    fontSize: 15,
    fontWeight: '700',
  },
  rating: {
    color: '#b57616',
    fontSize: 13,
    fontWeight: '700',
  },
  address: {
    color: '#697580',
    fontSize: 12,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  price: {
    color: '#213b35',
    fontSize: 12,
    fontWeight: '700',
  },
  distance: {
    color: '#697580',
    fontSize: 12,
  },
  amenities: {
    color: '#79838d',
    fontSize: 11,
    marginTop: 4,
  },
});
