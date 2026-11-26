import type { Gym } from '../types/gym';

export type RootStackParamList = {
  MainTabs: undefined;
  GymDetail: {
    gymId: string;
    initialGym?: Gym;
  };
};

export type MainTabParamList = {
  Explore: undefined;
  Favorites: undefined;
};
