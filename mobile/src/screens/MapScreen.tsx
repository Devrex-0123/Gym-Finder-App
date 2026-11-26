import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
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

export default function MapScreen() {
  const navigation = useNavigation<RootNavigation>();
  const {
    location,
    hasUserLocation,
    loading: locationLoading,
    error: locationError,
  } = useLocation();
  const [mapCenter, setMapCenter] = useState<Coordinates>(location);
  const [searchCenter, setSearchCenter] = useState<Coordinates>(location);
  const [pendingCenter, setPendingCenter] = useState<Coordinates>(location);
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [amenity, setAmenity] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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
        if (active) setError(getApiErrorMessage(reason));
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
    setError(null);

    getNearbyGyms(searchCenter.latitude, searchCenter.longitude, {
      search: debouncedQuery,
      amenity,
      maxPrice,
    })
      .then((result) => {
        if (active) setGyms(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(getApiErrorMessage(reason));
          setGyms([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
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

  function openGym(gym: Gym) {
    setSelectedGym(gym);
  }

  async function openGymFromMap(gymId: string) {
    const currentGym = gyms.find((gym) => gym._id === gymId);
    if (currentGym) {
      setSelectedGym(currentGym);
      return;
    }

    try {
      const gym = await getGymById(gymId);
      setSelectedGym(gym);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  async function toggleSelectedFavorite() {
    if (!selectedGym) return;
    const shouldSave = !favoriteIds.includes(selectedGym._id);
    try {
      const saved = await setFavorite(selectedGym, shouldSave);
      setFavoriteIds(saved.map((gym) => gym._id));
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  function searchThisArea() {
    setSearchCenter(pendingCenter);
    setHasMovedMap(false);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.brand}>GYMFINDER</Text>
            <Text style={styles.tagline}>Find your next workout</Text>
          </View>
          <View style={styles.locationBadge}>
            <Text style={styles.locationBadgeText}>CEBU</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search gyms"
            value={query}
            onChangeText={setQuery}
            placeholder="Search gym or city"
            placeholderTextColor="#87918f"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Text style={styles.clearSearch}>×</Text>
            </Pressable>
          )}
        </View>
      </View>

      {locationError && (
        <View style={styles.locationNotice}>
          <Text style={styles.locationNoticeText}>{locationError}</Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapWebView
          center={mapCenter}
          userLocation={hasUserLocation ? location : null}
          gyms={gyms}
          onGymPress={(id) => void openGymFromMap(id)}
          onMapMove={(center) => {
            setPendingCenter(center);
            setHasMovedMap(true);
          }}
          onMapError={setMapError}
        />
        {hasMovedMap && (
          <Pressable onPress={searchThisArea} style={styles.searchAreaButton}>
            <Text style={styles.searchAreaText}>Search this area</Text>
          </Pressable>
        )}
      </View>
      {mapError && (
        <View style={styles.mapErrorNotice}>
          <Text numberOfLines={2} style={styles.mapErrorText}>
            Map issue: {mapError}
          </Text>
        </View>
      )}

      <FilterBar
        amenity={amenity}
        maxPrice={maxPrice}
        onAmenityChange={setAmenity}
        onMaxPriceChange={setMaxPrice}
      />

      <View style={styles.resultsHeading}>
        <View>
          <Text style={styles.resultsTitle}>Nearby gyms</Text>
          <Text style={styles.resultsSubtitle}>
            {gyms.length} {gyms.length === 1 ? 'place' : 'places'} · sorted by distance
          </Text>
        </View>
        {loading && <ActivityIndicator color="#173c35" />}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((value) => value + 1)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={gyms}
        keyExtractor={(gym) => gym._id}
        renderItem={({ item }) => (
          <GymCard gym={item} onPress={() => openGym(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => setRefreshKey((value) => value + 1)}
            tintColor="#173c35"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {error ? 'Could not load gyms' : 'No gyms found here'}
              </Text>
              <Text style={styles.emptyText}>
                {error
                  ? 'Check that the API is running and try again.'
                  : 'Try another filter or search a different map area.'}
              </Text>
            </View>
          )
        }
      />

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
    backgroundColor: '#f4f6f8',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#173c35',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  brand: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  tagline: {
    color: '#c4d6d1',
    fontSize: 12,
    marginTop: 2,
  },
  locationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: '#28594c',
  },
  locationBadgeText: {
    color: '#e5f2ec',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  searchBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  searchGlyph: {
    color: '#52625c',
    fontSize: 23,
    marginRight: 7,
    marginTop: -4,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: '#17221f',
    fontSize: 14,
  },
  clearSearch: {
    color: '#68756f',
    fontSize: 22,
    paddingHorizontal: 3,
  },
  locationNotice: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff4df',
  },
  locationNoticeText: {
    color: '#765116',
    fontSize: 11,
  },
  mapContainer: {
    position: 'relative',
  },
  searchAreaButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 14,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#173c35',
    elevation: 3,
  },
  searchAreaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  mapErrorNotice: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff4df',
  },
  mapErrorText: {
    color: '#765116',
    fontSize: 10,
  },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 9,
  },
  resultsTitle: {
    color: '#17221f',
    fontSize: 17,
    fontWeight: '800',
  },
  resultsSubtitle: {
    color: '#77828b',
    fontSize: 11,
    marginTop: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fdecec',
  },
  errorText: {
    flex: 1,
    color: '#9b2c2c',
    fontSize: 11,
  },
  retryText: {
    color: '#8b2020',
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#26332f',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#78838b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
