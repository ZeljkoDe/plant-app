import { Alert } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { CARE_GUIDES } from '../constants/appConstants';
import { toISODate } from '../utils/dateUtils';
import { computeLearnedInterval, predictNextReminder } from '../utils/wateringModel';
import { createEmptyState, loadState, persistState } from '../services/storageService';
import {
  cancelNotification,
  ensureNotificationCategory,
  onNotificationAction,
  requestNotificationPermission,
  schedulePlantReminderNotification,
} from '../services/notificationService';
import { pickImageFromLibrary } from '../services/imageService';
import { identifyPlantFromImage } from '../services/plantIdentifierService';

export function usePlantyApp() {
  const [tab, setTab] = useState('garden');
  const [state, setState] = useState(createEmptyState());
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [filterLocationId, setFilterLocationId] = useState('all');
  const [wishlistInput, setWishlistInput] = useState('');
  const [form, setForm] = useState({ name: '', species: '', locationId: '', image: '', newLocationName: '' });

  const filteredPlants = useMemo(() => {
    if (filterLocationId === 'all') return state.plants;
    return state.plants.filter((plant) => plant.locationId === filterLocationId);
  }, [state.plants, filterLocationId]);

  const dueNow = useMemo(
    () => state.plants.filter((plant) => new Date(plant.nextReminderAt) <= new Date()).length,
    [state.plants],
  );

  const guidesToShow = useMemo(() => {
    const inGardenSpecies = new Set(state.plants.map((p) => p.species.toLowerCase()));
    return Object.entries(CARE_GUIDES).filter(([key]) => inGardenSpecies.has(key) || !state.plants.length);
  }, [state.plants]);

  useEffect(() => {
    loadState().then(setState);
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    ensureNotificationCategory();
    const sub = onNotificationAction(({ action, data }) => {
      if (!data.plantId) return;
      if (action === 'watered') markAsWatered(data.plantId, 'notification');
      if (action === 'snooze') snoozePlantReminder(data.plantId);
    });

    return () => sub.remove();
  }, [state.plants]);

  async function scheduleReminder(plant) {
    const ok = await requestNotificationPermission();
    if (!ok) return plant;

    await cancelNotification(plant.notificationId);
    const notificationId = await schedulePlantReminderNotification(plant);
    return { ...plant, notificationId };
  }

  async function pickImage() {
    const image = await pickImageFromLibrary();
    if (image) setForm((prev) => ({ ...prev, image }));
  }

  function identifySpecies() {
    if (!form.image) {
      Alert.alert('Add photo first', 'Pick an image so Planty can identify likely species.');
      return;
    }

    const guess = identifyPlantFromImage();
    setForm((prev) => ({ ...prev, species: guess }));
    Alert.alert('Plant identified', `Likely ${guess} (mock AI for MVP).`);
  }

  async function addPlant() {
    if (!form.name.trim()) return Alert.alert('Missing name', 'Add a plant name.');
    if (!form.image) return Alert.alert('Missing image', 'Please choose a plant photo.');

    const now = toISODate();
    const history = [now];
    const learnedIntervalDays = computeLearnedInterval(history);
    const nextReminderAt = predictNextReminder(now, learnedIntervalDays);

    let plant = {
      id: `plant-${Date.now()}`,
      name: form.name.trim(),
      species: form.species.trim() || 'Unknown',
      locationId: form.locationId || state.locations[0]?.id || null,
      image: form.image,
      wateringHistory: history,
      learnedIntervalDays,
      nextReminderAt,
      notificationId: null,
      createdAt: now,
    };

    plant = await scheduleReminder(plant);
    setState((prev) => ({ ...prev, plants: [plant, ...prev.plants] }));
    setForm((prev) => ({ ...prev, name: '', species: '', locationId: '', image: '' }));
  }

  async function markAsWatered(plantId, source = 'manual') {
    const now = toISODate();
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;

    const nextHistory = [...plant.wateringHistory, now];
    const learnedIntervalDays = computeLearnedInterval(nextHistory);
    const nextReminderAt = predictNextReminder(now, learnedIntervalDays);

    let updatedPlant = { ...plant, wateringHistory: nextHistory, learnedIntervalDays, nextReminderAt };
    updatedPlant = await scheduleReminder(updatedPlant);

    const entry = {
      id: `entry-${Date.now()}`,
      plantId,
      type: 'Watering',
      note: source === 'notification' ? 'Marked as watered from notification.' : 'Plant watered.',
      photo: null,
      createdAt: now,
    };

    setState((prev) => ({
      ...prev,
      plants: prev.plants.map((p) => (p.id === plantId ? updatedPlant : p)),
      journalEntries: [entry, ...prev.journalEntries],
    }));
  }

  async function snoozePlantReminder(plantId) {
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;

    const nextReminderAt = new Date();
    nextReminderAt.setDate(nextReminderAt.getDate() + 1);
    nextReminderAt.setHours(9, 0, 0, 0);

    let updated = { ...plant, nextReminderAt: nextReminderAt.toISOString() };
    updated = await scheduleReminder(updated);

    setState((prev) => ({ ...prev, plants: prev.plants.map((p) => (p.id === plantId ? updated : p)) }));
  }

  function addJournalEntry(plantId, type) {
    const entry = {
      id: `entry-${Date.now()}`,
      plantId,
      type,
      note: `${type} logged in Planty journal.`,
      photo: null,
      createdAt: toISODate(),
    };
    setState((prev) => ({ ...prev, journalEntries: [entry, ...prev.journalEntries] }));
  }

  function addLocation() {
    if (!form.newLocationName.trim()) return;
    const location = { id: `loc-${Date.now()}`, name: form.newLocationName.trim() };
    setState((prev) => ({ ...prev, locations: [...prev.locations, location] }));
    setForm((prev) => ({ ...prev, newLocationName: '' }));
  }

  function togglePlantSelection(plantId) {
    setSelectedPlantIds((prev) =>
      prev.includes(plantId) ? prev.filter((id) => id !== plantId) : [...prev, plantId],
    );
  }

  async function bulkWaterPlants() {
    if (!selectedPlantIds.length) return;
    for (const plantId of selectedPlantIds) {
      // eslint-disable-next-line no-await-in-loop
      await markAsWatered(plantId, 'bulk');
    }
    setSelectedPlantIds([]);
  }

  function addWishlistItem() {
    if (!wishlistInput.trim()) return;
    const item = { id: `wish-${Date.now()}`, label: wishlistInput.trim(), createdAt: toISODate() };
    setState((prev) => ({ ...prev, wishlist: [item, ...prev.wishlist] }));
    setWishlistInput('');
  }

  function convertWishlistToPlant(item) {
    setForm((prev) => ({ ...prev, name: item.label }));
    setTab('garden');
    setState((prev) => ({ ...prev, wishlist: prev.wishlist.filter((w) => w.id !== item.id) }));
    Alert.alert('Moved to Garden', `Added "${item.label}" to add-plant form.`);
  }

  return {
    tab,
    setTab,
    state,
    form,
    setForm,
    wishlistInput,
    setWishlistInput,
    filteredPlants,
    selectedPlantIds,
    filterLocationId,
    setFilterLocationId,
    dueNow,
    guidesToShow,
    actions: {
      pickImage,
      identifySpecies,
      addPlant,
      markAsWatered,
      snoozePlantReminder,
      addJournalEntry,
      addLocation,
      togglePlantSelection,
      bulkWaterPlants,
      addWishlistItem,
      convertWishlistToPlant,
    },
  };
}
