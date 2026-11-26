import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GymCard from '../components/GymCard';
import type { RootStackParamList } from '../navigation/types';
import { getApiErrorMessage } from '../services/api';
import { getFavorites, setFavorite } from '../services/favorites';
import type { Gym } from '../types/gym';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export default function FavoritesScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      setLoading(true);
      try {
        const saved = await getFavorites();
        if (active) {
          setGyms(saved);
          setError(null);
        }
      } catch (reason) {
        if (active) setError(getApiErrorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFavorites();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadFavorites();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigation]);

  async function removeFavorite(gym: Gym) {
    try {
      const next = await setFavorite(gym, false);
      setGyms(next);
      setError(null);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.brand}>SAVED GYMS</Text>
        <Text style={styles.subtitle}>Your workout shortlist</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading && gyms.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#173c35" size="large" />
        </View>
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(gym) => gym._id}
          contentContainerStyle={gyms.length ? styles.list : styles.emptyList}
          renderItem={({ item }) => (
            <View>
              <GymCard
                gym={item}
                onPress={() =>
                  navigation.navigate('GymDetail', {
                    gymId: item._id,
                    initialGym: item,
                  })
                }
              />
              <Pressable onPress={() => void removeFavorite(item)} style={styles.removeButton}>
                <Text style={styles.removeText}>Remove from favorites</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No saved gyms yet</Text>
              <Text style={styles.emptyText}>
                Save a gym from its details to keep it here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 18,
    backgroundColor: '#173c35',
  },
  brand: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  subtitle: {
    color: '#c4d6d1',
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#26332f',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#78838b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
  },
  removeButton: {
    alignSelf: 'flex-end',
    marginTop: -7,
    marginRight: 24,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeText: {
    color: '#a33b3b',
    fontSize: 11,
    fontWeight: '700',
  },
  error: {
    color: '#9b2c2c',
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: '#fdecec',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
