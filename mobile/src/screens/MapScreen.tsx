import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FilterBar from '../components/FilterBar';
import GymBottomSheet from '../components/GymBottomSheet';
import GymCard from '../components/GymCard';
import MapWebView from '../components/MapWebView';
import { useLocation } from '../hooks/useLocation';
import type { RootStackParamList } from '../navigation/types';
import { getApiErrorMessage, getGymById, getNearbyGyms } from '../services/api';
import { getFavorites, setFavorite } from '../services/favorites';
import type { Coordinates, Gym } from '../types/gym';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = 'map' | 'list';

const CAROUSEL_SIDE_GAP = 24;
const CAROUSEL_CARD_GAP = 10;
/** Height of the card carousel + its bottom margin; the map keeps pins above it. */
const CAROUSEL_HEIGHT = 112;
/** The first search in a new area waits on OpenStreetMap, which can take ~1 min. */
const SLOW_LOADING_MS = 6000;

export default function MapScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { width: screenWidth } = useWindowDimensions();
  const {
    location,
    hasUserLocation,
    loading: locationLoading,
    error: locationError,
  } = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [mapCenter, setMapCenter] = useState<Coordinates>(location);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(location);
  const [pendingCenter, setPendingCenter] = useState<Coordinates>(location);
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [amenity, setAmenity] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [focusedGymId, setFocusedGymId] = useState<string | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const carouselRef = useRef<FlatList<Gym>>(null);

  const cardWidth = screenWidth - CAROUSEL_SIDE_GAP * 2;
  const cardInterval = cardWidth + CAROUSEL_CARD_GAP;

  useEffect(() => {
    if (locationLoading) return;
    setMapCenter(location);
    setSearchCenter(location);
    setPendingCenter(location);
  }, [location, locationLoading]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    const loadFavorites = async () => {
      try {
        const saved = await getFavorites();
        if (active) setFavoriteIds(saved.map((gym) => gym._id));
      } catch (reason) {
        if (active) setNoticeError(getApiErrorMessage(reason));
      }
    };

    void loadFavorites();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadFavorites();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (locationLoading) return;
    let active = true;
    setLoading(true);
    setSlowLoading(false);
    setError(null);
    const slowTimer = setTimeout(() => {
      if (active) setSlowLoading(true);
    }, SLOW_LOADING_MS);

    getNearbyGyms(searchCenter.latitude, searchCenter.longitude, {
      search: debouncedQuery,
      amenity,
      maxPrice,
    })
      .then((result) => {
        if (!active) return;
        setGyms(result);
        setFocusedGymId(null);
        carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(getApiErrorMessage(reason));
          setGyms([]);
        }
      })
      .finally(() => {
        clearTimeout(slowTimer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(slowTimer);
    };
  }, [
    amenity,
    debouncedQuery,
    locationLoading,
    maxPrice,
    refreshKey,
    searchCenter.latitude,
    searchCenter.longitude,
  ]);

  function retry() {
    setRefreshKey((value) => value + 1);
  }

  async function handleMarkerPress(gymId: string) {
    const index = gyms.findIndex((gym) => gym._id === gymId);
    if (index === -1) {
      try {
        setSelectedGym(await getGymById(gymId));
      } catch (reason) {
        setNoticeError(getApiErrorMessage(reason));
      }
      return;
    }
    // Second tap on the highlighted pin opens its details.
    if (focusedGymId === gymId) {
      setSelectedGym(gyms[index]);
      return;
    }
    setFocusedGymId(gymId);
    carouselRef.current?.scrollToIndex({ index, animated: true });
  }

  function handleCarouselSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardInterval);
    const gym = gyms[Math.min(Math.max(index, 0), gyms.length - 1)];
    if (gym) setFocusedGymId(gym._id);
  }

  async function toggleSelectedFavorite() {
    if (!selectedGym) return;
    const shouldSave = !favoriteIds.includes(selectedGym._id);
    try {
      const saved = await setFavorite(selectedGym, shouldSave);
      setFavoriteIds(saved.map((gym) => gym._id));
    } catch (reason) {
      setNoticeError(getApiErrorMessage(reason));
    }
  }

  function searchThisArea() {
    setSearchCenter(pendingCenter);
    setHasMovedMap(false);
  }

  function recenterOnUser() {
    // New object so the map re-centers even if the coordinates are unchanged.
    setMapCenter({ ...location });
    setPendingCenter(location);
    setSearchCenter(location);
    setHasMovedMap(false);
  }

  const resultsLabel = loading
    ? 'Searching…'
    : `${gyms.length} ${gyms.length === 1 ? 'gym' : 'gyms'} nearby`;
  const emptyHint =
    maxPrice != null
      ? 'Most listings don’t include prices yet. Try “Any price”.'
      : 'Try another filter, or move the map and tap “Search this area”.';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.brand}>
              GYM<Text style={styles.brandAccent}>FINDER</Text>
            </Text>
            <Text style={styles.tagline}>Find your next workout</Text>
          </View>
          <View style={styles.segmented} accessibilityRole="tablist">
            {(['map', 'list'] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setViewMode(mode)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Ionicons
                    name={mode === 'map' ? 'map' : 'list'}
                    size={14}
                    color={active ? '#fff' : '#C9C9CF'}
                  />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {mode === 'map' ? 'Map' : 'List'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#4A4A52" />
          <TextInput
            accessibilityLabel="Search gyms"
            value={query}
            onChangeText={setQuery}
            placeholder="Search gym or city"
            placeholderTextColor="#8E8E96"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color="#8E8E96" />
            </Pressable>
          )}
        </View>
      </View>

      <FilterBar
        amenity={amenity}
        maxPrice={maxPrice}
        onAmenityChange={setAmenity}
        onMaxPriceChange={setMaxPrice}
      />

      {(locationError || noticeError) && (
        <Pressable onPress={() => setNoticeError(null)} style={styles.notice}>
          <Ionicons name="information-circle" size={15} color="#765116" />
          <Text style={styles.noticeText} numberOfLines={2}>
            {noticeError || locationError}
          </Text>
        </Pressable>
      )}

      <View style={styles.body}>
        <MapWebView
          center={mapCenter}
          userLocation={hasUserLocation ? location : null}
          gyms={gyms}
          selectedGymId={focusedGymId}
          bottomInset={gyms.length > 0 ? CAROUSEL_HEIGHT : 0}
          onGymPress={(id) => void handleMarkerPress(id)}
          onMapMove={(center) => {
            setPendingCenter(center);
            setHasMovedMap(true);
          }}
          onMapError={(message) => setNoticeError(`Map issue: ${message}`)}
        />

        {/* Map-mode overlays */}
        <View style={styles.mapTopOverlay} pointerEvents="box-none">
          {loading ? (
            <View style={styles.statusPill}>
              <ActivityIndicator size="small" color="#E11D2E" />
              <Text style={styles.statusText}>
                {slowLoading ? 'Fetching gyms for this area… up to a minute' : 'Finding gyms…'}
              </Text>
            </View>
          ) : error ? (
            <Pressable onPress={retry} style={[styles.statusPill, styles.errorPill]}>
              <Ionicons name="alert-circle" size={16} color="#9b2c2c" />
              <Text style={[styles.statusText, styles.errorText]} numberOfLines={1}>
                Couldn’t load gyms · Tap to retry
              </Text>
            </Pressable>
          ) : hasMovedMap ? (
            <Pressable onPress={searchThisArea} style={styles.searchAreaButton}>
              <Ionicons name="search" size={14} color="#fff" />
              <Text style={styles.searchAreaText}>Search this area</Text>
            </Pressable>
          ) : null}
        </View>

        {hasUserLocation && (
          <Pressable
            accessibilityLabel="Center map on my location"
            onPress={recenterOnUser}
            style={[
              styles.locateButton,
              { bottom: (gyms.length > 0 ? CAROUSEL_HEIGHT : 0) + 14 },
            ]}
          >
            <Ionicons name="locate" size={22} color="#111111" />
          </Pressable>
        )}

        {gyms.length > 0 ? (
          <FlatList
            ref={carouselRef}
            data={gyms}
            horizontal
            keyExtractor={(gym) => gym._id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardInterval}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            style={styles.carousel}
            getItemLayout={(_, index) => ({
              length: cardInterval,
              offset: cardInterval * index,
              index,
            })}
            onMomentumScrollEnd={handleCarouselSettled}
            renderItem={({ item }) => (
              <GymCard
                gym={item}
                variant="compact"
                selected={item._id === focusedGymId}
                onPress={() => setSelectedGym(item)}
                style={{ width: cardWidth, marginRight: CAROUSEL_CARD_GAP }}
              />
            )}
          />
        ) : (
          !loading &&
          !error && (
            <View style={styles.mapEmptyCard}>
              <Ionicons name="barbell-outline" size={22} color="#111111" />
              <View style={styles.mapEmptyTextWrap}>
                <Text style={styles.emptyTitle}>No gyms found here</Text>
                <Text style={styles.emptyText}>{emptyHint}</Text>
              </View>
            </View>
          )
        )}

        {viewMode === 'list' && (
          <View style={styles.listLayer}>
            <FlatList
              data={gyms}
              keyExtractor={(gym) => gym._id}
              renderItem={({ item }) => (
                <GymCard gym={item} onPress={() => setSelectedGym(item)} />
              )}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.resultsHeading}>
                  <Text style={styles.resultsTitle}>{resultsLabel}</Text>
                  {!loading && gyms.length > 0 && (
                    <Text style={styles.resultsSubtitle}>Sorted by distance</Text>
                  )}
                  {error && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>{error}</Text>
                      <Pressable onPress={retry} hitSlop={8}>
                        <Text style={styles.retryText}>Retry</Text>
                      </Pressable>
                    </View>
                  )}
                  {loading && slowLoading && (
                    <Text style={styles.resultsSubtitle}>
                      First search in a new area can take up to a minute.
                    </Text>
                  )}
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={retry} tintColor="#E11D2E" colors={["#E11D2E"]} />
              }
              ListEmptyComponent={
                loading ? undefined : (
                  <View style={styles.emptyState}>
                    <Ionicons name="barbell-outline" size={36} color="#8E8E96" />
                    <Text style={styles.emptyTitle}>
                      {error ? 'Could not load gyms' : 'No gyms found here'}
                    </Text>
                    <Text style={[styles.emptyText, styles.centeredText]}>
                      {error ? 'Check that the API is running and try again.' : emptyHint}
                    </Text>
                  </View>
                )
              }
            />
          </View>
        )}
      </View>

      <GymBottomSheet
        gym={selectedGym}
        visible={selectedGym !== null}
        isFavorite={selectedGym ? favoriteIds.includes(selectedGym._id) : false}
        onClose={() => setSelectedGym(null)}
        onToggleFavorite={() => void toggleSelectedFavorite()}
        onOpenDetails={() => {
          if (!selectedGym) return;
          const gym = selectedGym;
          setSelectedGym(null);
          navigation.navigate('GymDetail', {
            gymId: gym._id,
            initialGym: gym,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F6',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#111111',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  brand: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  brandAccent: {
    color: '#E11D2E',
  },
  tagline: {
    color: '#B8B8BE',
    fontSize: 12,
    marginTop: 2,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 18,
    backgroundColor: '#2A2A2E',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  segmentActive: {
    backgroundColor: '#E11D2E',
  },
  segmentText: {
    color: '#C9C9CF',
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#fff',
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: '#111111',
    fontSize: 14,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#fff4df',
  },
  noticeText: {
    flex: 1,
    color: '#765116',
    fontSize: 11,
  },
  body: {
    flex: 1,
  },
  mapTopOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statusText: {
    flexShrink: 1,
    color: '#111111',
    fontSize: 12,
    fontWeight: '700',
  },
  errorPill: {
    backgroundColor: '#fdecec',
  },
  errorText: {
    color: '#9b2c2c',
  },
  searchAreaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E11D2E',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchAreaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  locateButton: {
    position: 'absolute',
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  carousel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexGrow: 0,
  },
  carouselContent: {
    paddingHorizontal: CAROUSEL_SIDE_GAP,
    paddingVertical: 4,
  },
  mapEmptyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  mapEmptyTextWrap: {
    flex: 1,
  },
  listLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F5F5F6',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  resultsHeading: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 3,
  },
  resultsTitle: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '800',
  },
  resultsSubtitle: {
    color: '#77828b',
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fdecec',
  },
  errorBannerText: {
    flex: 1,
    color: '#9b2c2c',
    fontSize: 12,
  },
  retryText: {
    color: '#8b2020',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#1A1A1D',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#78838b',
    fontSize: 12,
    marginTop: 2,
  },
  centeredText: {
    textAlign: 'center',
  },
});
