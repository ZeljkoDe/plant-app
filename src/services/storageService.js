import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, DEFAULT_LOCATIONS } from '../constants/appConstants';

export function createEmptyState() {
  return {
    plants: [],
    locations: DEFAULT_LOCATIONS,
    journalEntries: [],
    wishlist: [],
  };
}

export async function loadState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : createEmptyState();
}

export async function persistState(state) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
