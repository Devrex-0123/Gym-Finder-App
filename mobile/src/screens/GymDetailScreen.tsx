import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getApiErrorMessage, getGymById } from '../services/api';
import { getFavorites, setFavorite } from '../services/favorites';
import type { RootStackParamList } from '../navigation/types';
import type { Gym } from '../types/gym';

type Props = NativeStackScreenProps<RootStackParamList, 'GymDetail'>;

export default function GymDetailScreen({ route, navigation }: Props) {
  const [gym, setGym] = useState<Gym | null>(route.params.initialGym || null);
  const [loading, setLoading] = useState(!route.params.initialGym);
  const [favorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGymById(route.params.gymId)
      .then((result) => {
        if (active) setGym(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(getApiErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [route.params.gymId]);

  useEffect(() => {
    if (!gym) return;
    let active = true;
    getFavorites()
      .then((saved) => {
        if (active) setIsFavorite(saved.some((item) => item._id === gym._id));
      })
      .catch((reason: unknown) => {
        if (active) setError(getApiErrorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [gym?._id]);

  async function toggleFavorite() {
    if (!gym) return;
    try {
      const next = await setFavorite(gym, !favorite);
      setIsFavorite(next.some((item) => item._id === gym._id));
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  async function openLink(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('No app can open this link on the device.');
      await Linking.openURL(url);
    } catch (reason) {
      Alert.alert('Unable to open link', getApiErrorMessage(reason));
    }
  }

  if (!gym && loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#173c35" />
        <Text style={styles.muted}>Loading gym details…</Text>
      </SafeAreaView>
    );
  }

  if (!gym) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Gym details unavailable</Text>
        <Text style={styles.muted}>{error || 'The gym could not be found.'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const [longitude, latitude] = gym.location.coordinates;
  const address =
    gym.address || [gym.barangay, gym.city].filter(Boolean).join(', ') || 'Address not listed';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Gym details</Text>
        <Pressable
          accessibilityLabel={favorite ? 'Remove from favorites' : 'Save to favorites'}
          onPress={() => void toggleFavorite()}
          hitSlop={8}
          style={styles.saveButton}
        >
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color="#fff" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorBanner}>{error}</Text>}
        {gym.image ? (
          <Image source={{ uri: gym.image }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageTitle}>GYM FINDER</Text>
            <Text style={styles.imageSubTitle}>Photo not listed</Text>
          </View>
        )}
        <Text style={styles.name}>{gym.name}</Text>
        <Text style={styles.address}>{address}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>
            {gym.rating == null ? 'Not rated' : `${gym.rating.toFixed(1)} / 5`}
          </Text>
          <Text style={styles.reviewCount}>
            {gym.totalReviews == null ? '' : `${gym.totalReviews} reviews`}
          </Text>
        </View>
        {loading && <ActivityIndicator color="#173c35" style={styles.refreshIndicator} />}

        <View style={styles.priceRow}>
          <View style={styles.priceCard}>
            <Text style={styles.sectionLabel}>MONTHLY</Text>
            <Text style={styles.price}>
              {gym.pricePerMonth == null
                ? 'Not listed'
                : `₱${gym.pricePerMonth.toLocaleString('en-PH')}`}
            </Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.sectionLabel}>PER SESSION</Text>
            <Text style={styles.price}>
              {gym.pricePerSession == null
                ? 'Not listed'
                : `₱${gym.pricePerSession.toLocaleString('en-PH')}`}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>HOURS</Text>
        <Text style={styles.bodyText}>
          {gym.is24Hours ? 'Open 24 hours' : gym.hours || 'Hours not listed'}
        </Text>

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>AMENITIES</Text>
        {gym.amenities.length ? (
          <View style={styles.amenities}>
            {gym.amenities.map((amenity) => (
              <View key={amenity} style={styles.amenityChip}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>Amenities not listed</Text>
        )}

        {gym.phone && (
          <Pressable onPress={() => void openLink(`tel:${gym.phone}`)} style={styles.phoneButton}>
            <Text style={styles.phoneText}>Call {gym.phone}</Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              void openLink(
                `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
              )
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Directions</Text>
          </Pressable>
          <Pressable
            onPress={() => void toggleFavorite()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {favorite ? 'Remove favorite' : 'Add favorite'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.source}>
          Listing source: {gym.source === 'osm' ? 'OpenStreetMap' : 'GymFinder'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#173c35',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#173c35',
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 38,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 25,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
    backgroundColor: '#f4f6f8',
  },
  image: {
    height: 220,
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#e8edf0',
  },
  imageFallback: {
    height: 220,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#214b40',
  },
  imageTitle: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 22,
  },
  imageSubTitle: {
    color: '#d0e0d9',
    marginTop: 7,
  },
  name: {
    color: '#17221f',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  address: {
    color: '#697580',
    fontSize: 14,
    marginTop: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  rating: {
    color: '#a66b12',
    fontWeight: '800',
  },
  reviewCount: {
    color: '#74808a',
    fontSize: 12,
  },
  refreshIndicator: {
    marginTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    marginBottom: 20,
  },
  priceCard: {
    flex: 1,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  sectionLabel: {
    color: '#78838b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  price: {
    color: '#183d36',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 7,
  },
  bodyText: {
    color: '#283532',
    fontSize: 14,
    marginTop: 7,
  },
  sectionSpacing: {
    marginTop: 22,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenityChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#e3ece7',
  },
  amenityText: {
    color: '#315b4c',
    fontSize: 12,
    fontWeight: '700',
  },
  phoneButton: {
    marginTop: 18,
  },
  phoneText: {
    color: '#24634f',
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: '#173c35',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#cdd9d3',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#24493c',
    fontWeight: '800',
    fontSize: 14,
  },
  source: {
    color: '#8b949c',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 22,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f4f6f8',
  },
  muted: {
    color: '#697580',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  errorTitle: {
    color: '#17221f',
    fontSize: 20,
    fontWeight: '800',
  },
  errorBanner: {
    color: '#9b2c2c',
    backgroundColor: '#fdecec',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
});
