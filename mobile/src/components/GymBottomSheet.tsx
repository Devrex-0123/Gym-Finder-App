import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Gym } from '../types/gym';

interface GymBottomSheetProps {
  gym: Gym | null;
  visible: boolean;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
}

function priceText(value: number | null, period: string): string {
  return value == null ? 'Not listed' : `₱${value.toLocaleString('en-PH')} ${period}`;
}

async function openExternalUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('No app can open this link on the device.');
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      'Unable to open link',
      error instanceof Error ? error.message : 'Please try again.',
    );
  }
}

export default function GymBottomSheet({
  gym,
  visible,
  isFavorite,
  onClose,
  onToggleFavorite,
  onOpenDetails,
}: GymBottomSheetProps) {
  if (!gym) return null;

  const [longitude, latitude] = gym.location.coordinates;
  const distance =
    gym.distanceMeters == null ? null : `${(gym.distanceMeters / 1000).toFixed(1)} km away`;
  const address =
    gym.address || [gym.barangay, gym.city].filter(Boolean).join(', ') || 'Address not listed';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close gym details" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {gym.image ? (
              <Image source={{ uri: gym.image }} style={styles.image} />
            ) : (
              <View style={styles.imageFallback}>
                <Text style={styles.imageFallbackTitle}>GYM FINDER</Text>
                <Text style={styles.imageFallbackCaption}>Photo not listed</Text>
              </View>
            )}
            <View style={styles.titleRow}>
              <View style={styles.titleColumn}>
                <Text style={styles.name}>{gym.name}</Text>
                <Text style={styles.address}>{address}</Text>
                {distance && <Text style={styles.distance}>{distance}</Text>}
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.rating}>
                  {gym.rating == null ? '—' : gym.rating.toFixed(1)}
                </Text>
                <Text style={styles.reviewCount}>
                  {gym.totalReviews == null ? 'Not rated' : `${gym.totalReviews} reviews`}
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceCard}>
                <Text style={styles.detailLabel}>MONTHLY</Text>
                <Text style={styles.price}>{priceText(gym.pricePerMonth, '/ month')}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.detailLabel}>SINGLE SESSION</Text>
                <Text style={styles.price}>{priceText(gym.pricePerSession, '/ session')}</Text>
              </View>
            </View>

            <Text style={styles.detailLabel}>HOURS</Text>
            <Text style={styles.detailValue}>
              {gym.is24Hours ? 'Open 24 hours' : gym.hours || 'Hours not listed'}
            </Text>

            <Text style={[styles.detailLabel, styles.amenitiesHeading]}>AMENITIES</Text>
            {gym.amenities.length ? (
              <View style={styles.amenities}>
                {gym.amenities.map((amenity) => (
                  <View key={amenity} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.detailValue}>Amenities not listed</Text>
            )}

            {gym.phone && (
              <Pressable
                onPress={() => void openExternalUrl(`tel:${gym.phone}`)}
                style={styles.phoneButton}
              >
                <Ionicons name="call" size={15} color="#E11D2E" />
                <Text style={styles.phoneText}>{gym.phone}</Text>
              </Pressable>
            )}

            {(gym.locationApproximate || gym.sourceUrl) && (
              <View style={styles.sourceNote}>
                <Ionicons name="information-circle-outline" size={15} color="#6b6b73" />
                <Text style={styles.sourceNoteText}>
                  {gym.locationApproximate ? 'Map pin is approximate (street level). ' : ''}
                  {gym.sourceUrl && (
                    <Text
                      style={styles.sourceLink}
                      onPress={() => void openExternalUrl(gym.sourceUrl as string)}
                    >
                      View listing
                    </Text>
                  )}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  void openExternalUrl(
                    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
                  )
                }
                style={[styles.actionButton, styles.directionsButton]}
              >
                <Ionicons name="navigate" size={17} color="#fff" />
                <Text style={styles.directionsText}>Directions</Text>
              </Pressable>
              <Pressable
                onPress={onToggleFavorite}
                style={[styles.actionButton, styles.favoriteButton]}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={17}
                  color={isFavorite ? '#c0392b' : '#1A1A1D'}
                />
                <Text style={styles.favoriteText}>{isFavorite ? 'Saved' : 'Favorite'}</Text>
              </Pressable>
            </View>
            <Pressable onPress={onOpenDetails} style={styles.fullDetailsButton}>
              <Text style={styles.fullDetailsText}>View full gym details</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#0006',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '86%',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#fff',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 3,
    backgroundColor: '#d8dde1',
  },
  image: {
    width: '100%',
    height: 156,
    borderRadius: 17,
    backgroundColor: '#e8edf0',
  },
  imageFallback: {
    height: 156,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  imageFallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  imageFallbackCaption: {
    color: '#B8B8BE',
    fontSize: 12,
    marginTop: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 16,
  },
  titleColumn: {
    flex: 1,
  },
  name: {
    color: '#111111',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
  },
  address: {
    color: '#67737d',
    fontSize: 13,
    marginTop: 5,
  },
  distance: {
    color: '#E11D2E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  ratingBadge: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  rating: {
    color: '#a66b12',
    fontSize: 17,
    fontWeight: '800',
  },
  reviewCount: {
    color: '#79838b',
    fontSize: 10,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 18,
  },
  priceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#F3F3F5',
  },
  detailLabel: {
    color: '#78838b',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  price: {
    color: '#1A1A1D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  detailValue: {
    color: '#1A1A1D',
    fontSize: 13,
    marginTop: 6,
  },
  amenitiesHeading: {
    marginTop: 18,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  amenityChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F3F3F5',
  },
  amenityText: {
    color: '#1A1A1D',
    fontSize: 11,
    fontWeight: '700',
  },
  sourceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F3F5',
  },
  sourceNoteText: {
    flex: 1,
    color: '#6b6b73',
    fontSize: 11,
  },
  sourceLink: {
    color: '#E11D2E',
    fontWeight: '800',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 8,
  },
  phoneText: {
    color: '#E11D2E',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
  },
  directionsButton: {
    backgroundColor: '#E11D2E',
  },
  directionsText: {
    color: '#fff',
    fontWeight: '800',
  },
  favoriteButton: {
    borderWidth: 1,
    borderColor: '#E2E2E6',
    backgroundColor: '#fff',
  },
  favoriteText: {
    color: '#1A1A1D',
    fontWeight: '800',
  },
  fullDetailsButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  fullDetailsText: {
    color: '#E11D2E',
    fontSize: 13,
    fontWeight: '700',
  },
});
