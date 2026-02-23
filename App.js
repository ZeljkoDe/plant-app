import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STORAGE_KEY = 'planty.state.v1';

const CARE_GUIDES = {
  pothos: {
    light: 'Bright to medium indirect light.',
    water: 'Water when top 2-4 cm of soil feels dry.',
    humidity: 'Average home humidity is okay.',
    soil: 'Well-draining indoor potting mix.',
    temperature: '18-29°C.',
  },
  monstera: {
    light: 'Bright indirect light.',
    water: 'Allow top few centimeters to dry first.',
    humidity: 'Medium to high humidity preferred.',
    soil: 'Chunky aroid mix with drainage.',
    temperature: '18-30°C.',
  },
  snakeplant: {
    light: 'Low to bright indirect light.',
    water: 'Water only when soil is fully dry.',
    humidity: 'Low to medium humidity.',
    soil: 'Very well-draining cactus/succulent mix.',
    temperature: '16-30°C.',
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function dayDiff(a, b) {
  return Math.max(1, (new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

function toISODate(date = new Date()) {
  return date.toISOString();
}

function toReadable(dateString) {
  return new Date(dateString).toLocaleDateString();
}

function computeLearnedInterval(history) {
  if (history.length < 2) return 7;
  const sorted = [...history].sort((a, b) => new Date(a) - new Date(b));
  const intervals = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const interval = dayDiff(sorted[i], sorted[i - 1]);
    if (interval >= 1 && interval <= 90) intervals.push(interval);
  }
  if (!intervals.length) return 7;

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const recent = intervals.slice(-3);
  const recentMean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  return Math.min(30, Math.max(2, mean * 0.6 + recentMean * 0.4));
}

function predictNextReminder(lastWateredAt, intervalDays) {
  const next = new Date(lastWateredAt);
  next.setHours(9, 0, 0, 0);
  next.setDate(next.getDate() + Math.round(intervalDays));
  if (next <= new Date()) {
    next.setDate(new Date().getDate() + 1);
  }
  return next.toISOString();
}

function confidenceLabel(historyCount) {
  if (historyCount < 3) return 'Learning';
  if (historyCount < 8) return 'Adapting';
  return 'Confident';
}

function emptyState() {
  return {
    plants: [],
    locations: [
      { id: 'loc-living-room', name: 'Living Room' },
      { id: 'loc-bedroom', name: 'Bedroom' },
      { id: 'loc-balcony', name: 'Balcony' },
    ],
    journalEntries: [],
    wishlist: [],
  };
}

export default function App() {
  const [tab, setTab] = useState('garden');
  const [state, setState] = useState(emptyState());
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [filterLocationId, setFilterLocationId] = useState('all');

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [locationId, setLocationId] = useState('');
  const [image, setImage] = useState('');

  const [newLocationName, setNewLocationName] = useState('');
  const [wishlistInput, setWishlistInput] = useState('');

  const filteredPlants = useMemo(() => {
    if (filterLocationId === 'all') return state.plants;
    return state.plants.filter((plant) => plant.locationId === filterLocationId);
  }, [state.plants, filterLocationId]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    (async () => {
      await Notifications.setNotificationCategoryAsync('planty-reminder', [
        {
          identifier: 'watered',
          buttonTitle: 'Mark as watered',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze 1 day',
          options: { opensAppToForeground: true },
        },
      ]);
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      const data = response.notification.request.content.data || {};
      if (!data.plantId) return;

      if (action === 'watered') {
        markAsWatered(data.plantId, 'notification');
      }
      if (action === 'snooze') {
        snoozePlantReminder(data.plantId);
      }
    });

    return () => sub.remove();
  }, [state.plants]);

  async function requestNotifPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async function scheduleReminder(plant) {
    const ok = await requestNotifPermission();
    if (!ok) return plant;

    if (plant.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(plant.notificationId).catch(() => null);
    }

    const triggerDate = new Date(plant.nextReminderAt);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💧 ${plant.name} might be thirsty`,
        body: `Planty learned ~${Math.round(plant.learnedIntervalDays)} day rhythm for this plant.`,
        categoryIdentifier: 'planty-reminder',
        data: { plantId: plant.id },
      },
      trigger: triggerDate,
    });

    return { ...plant, notificationId: id };
  }

  async function pickImage(setter = setImage) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) setter(result.assets[0].uri);
  }

  async function identifySpeciesFromImage() {
    if (!image) {
      Alert.alert('Add photo first', 'Pick an image so Planty can identify likely species.');
      return;
    }
    const guesses = ['Pothos', 'Monstera', 'Snake Plant'];
    const guess = guesses[Math.floor(Math.random() * guesses.length)];
    setSpecies(guess);
    Alert.alert('Plant identified', `Likely ${guess} (mock AI for MVP).`);
  }

  async function addPlant() {
    if (!name.trim()) return Alert.alert('Missing name', 'Add a plant name.');
    if (!image) return Alert.alert('Missing image', 'Please choose a plant photo.');

    const now = toISODate();
    const history = [now];
    const learnedIntervalDays = computeLearnedInterval(history);
    const nextReminderAt = predictNextReminder(now, learnedIntervalDays);

    let plant = {
      id: `plant-${Date.now()}`,
      name: name.trim(),
      species: species.trim() || 'Unknown',
      locationId: locationId || state.locations[0]?.id || null,
      image,
      wateringHistory: history,
      learnedIntervalDays,
      nextReminderAt,
      notificationId: null,
      createdAt: now,
    };

    plant = await scheduleReminder(plant);

    setState((prev) => ({ ...prev, plants: [plant, ...prev.plants] }));
    setName('');
    setSpecies('');
    setLocationId('');
    setImage('');
  }

  async function markAsWatered(plantId, source = 'manual') {
    const now = toISODate();
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;

    const nextHistory = [...plant.wateringHistory, now];
    const learnedIntervalDays = computeLearnedInterval(nextHistory);
    const nextReminderAt = predictNextReminder(now, learnedIntervalDays);

    let updatedPlant = {
      ...plant,
      wateringHistory: nextHistory,
      learnedIntervalDays,
      nextReminderAt,
    };

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

    setState((prev) => ({
      ...prev,
      plants: prev.plants.map((p) => (p.id === plantId ? updated : p)),
    }));
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
    if (!newLocationName.trim()) return;
    const location = { id: `loc-${Date.now()}`, name: newLocationName.trim() };
    setState((prev) => ({ ...prev, locations: [...prev.locations, location] }));
    setNewLocationName('');
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
    const item = {
      id: `wish-${Date.now()}`,
      label: wishlistInput.trim(),
      createdAt: toISODate(),
    };
    setState((prev) => ({ ...prev, wishlist: [item, ...prev.wishlist] }));
    setWishlistInput('');
  }

  async function convertWishlistToPlant(item) {
    setName(item.label);
    setTab('garden');
    setState((prev) => ({ ...prev, wishlist: prev.wishlist.filter((w) => w.id !== item.id) }));
    Alert.alert('Moved to Garden', `Added "${item.label}" to add-plant form.`);
  }

  const dueNow = state.plants.filter((plant) => new Date(plant.nextReminderAt) <= new Date()).length;

  const guidesToShow = useMemo(() => {
    const inGardenSpecies = new Set(state.plants.map((p) => p.species.toLowerCase()));
    return Object.entries(CARE_GUIDES).filter(([key]) => inGardenSpecies.has(key) || !state.plants.length);
  }, [state.plants]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.brand}>🌿 Planty</Text>
      <Text style={styles.tagline}>Your calm, adaptive plant care companion.</Text>

      <View style={styles.tabs}>
        {['garden', 'journal', 'guides', 'wishlist'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tabButton, tab === item ? styles.tabButtonActive : null]}
            onPress={() => setTab(item)}
          >
            <Text style={styles.tabButtonText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'garden' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Smart watering</Text>
            <Text style={styles.meta}>Due now: {dueNow}</Text>
            <Text style={styles.meta}>Planty learns each plant from real watering behavior.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add plant</Text>
            <TextInput style={styles.input} placeholder="Plant name" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="Species (optional)"
              value={species}
              onChangeText={setSpecies}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, filterLocationId === 'all' ? styles.chipActive : null]}
                onPress={() => setFilterLocationId('all')}
              >
                <Text style={styles.chipText}>All locations</Text>
              </TouchableOpacity>
              {state.locations.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.chip, locationId === loc.id ? styles.chipActive : null]}
                  onPress={() => setLocationId(loc.id)}
                >
                  <Text style={styles.chipText}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inlineRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(setImage)}>
                <Text style={styles.buttonText}>{image ? 'Change photo' : 'Pick photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={identifySpeciesFromImage}>
                <Text style={styles.buttonText}>Identify plant</Text>
              </TouchableOpacity>
            </View>

            {image ? <Image source={{ uri: image }} style={styles.preview} /> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={addPlant}>
              <Text style={styles.buttonText}>Add to Garden</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Locations</Text>
            <TextInput
              style={styles.input}
              placeholder="Add location (e.g. Office shelf)"
              value={newLocationName}
              onChangeText={setNewLocationName}
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={addLocation}>
              <Text style={styles.buttonText}>Add location</Text>
            </TouchableOpacity>
          </View>

          {!!selectedPlantIds.length ? (
            <TouchableOpacity style={styles.primaryButton} onPress={bulkWaterPlants}>
              <Text style={styles.buttonText}>Bulk water {selectedPlantIds.length} plants</Text>
            </TouchableOpacity>
          ) : null}

          {filteredPlants.map((plant) => {
            const location = state.locations.find((l) => l.id === plant.locationId)?.name || 'Unassigned';
            const confidence = confidenceLabel(plant.wateringHistory.length);
            return (
              <View style={styles.plantCard} key={plant.id}>
                <Image source={{ uri: plant.image }} style={styles.plantImage} />
                <View style={styles.plantInfo}>
                  <Text style={styles.plantName}>{plant.name}</Text>
                  <Text style={styles.meta}>{plant.species}</Text>
                  <Text style={styles.meta}>Location: {location}</Text>
                  <Text style={styles.meta}>Learned interval: {Math.round(plant.learnedIntervalDays)} days</Text>
                  <Text style={styles.meta}>Model: {confidence}</Text>
                  <Text style={styles.meta}>Next reminder: {toReadable(plant.nextReminderAt)}</Text>

                  <View style={styles.inlineRow}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => markAsWatered(plant.id)}>
                      <Text style={styles.buttonText}>Watered</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallButton} onPress={() => snoozePlantReminder(plant.id)}>
                      <Text style={styles.buttonText}>Snooze</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, selectedPlantIds.includes(plant.id) ? styles.chipActive : null]}
                      onPress={() => togglePlantSelection(plant.id)}
                    >
                      <Text style={styles.buttonText}>Select</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inlineRow}>
                    {['Repotting', 'Fertilizing', 'Pruning'].map((event) => (
                      <TouchableOpacity key={event} style={styles.tinyButton} onPress={() => addJournalEntry(plant.id, event)}>
                        <Text style={styles.tinyButtonText}>{event}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}

          {!filteredPlants.length ? <Text style={styles.meta}>No plants in this view yet.</Text> : null}
        </ScrollView>
      ) : null}

      {tab === 'journal' ? (
        <FlatList
          contentContainerStyle={styles.content}
          data={state.journalEntries}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.meta}>No journal entries yet.</Text>}
          renderItem={({ item }) => {
            const plant = state.plants.find((p) => p.id === item.plantId);
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.type}</Text>
                <Text style={styles.meta}>Plant: {plant?.name || 'Unknown plant'}</Text>
                <Text style={styles.meta}>Date: {toReadable(item.createdAt)}</Text>
                <Text style={styles.meta}>{item.note}</Text>
              </View>
            );
          }}
        />
      ) : null}

      {tab === 'guides' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {guidesToShow.map(([speciesKey, guide]) => (
            <View style={styles.card} key={speciesKey}>
              <Text style={styles.cardTitle}>{speciesKey}</Text>
              <Text style={styles.meta}>Light: {guide.light}</Text>
              <Text style={styles.meta}>Water: {guide.water}</Text>
              <Text style={styles.meta}>Humidity: {guide.humidity}</Text>
              <Text style={styles.meta}>Soil: {guide.soil}</Text>
              <Text style={styles.meta}>Temperature: {guide.temperature}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {tab === 'wishlist' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Plant wishlist</Text>
            <TextInput
              style={styles.input}
              placeholder="Dream plant"
              value={wishlistInput}
              onChangeText={setWishlistInput}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={addWishlistItem}>
              <Text style={styles.buttonText}>Add wishlist item</Text>
            </TouchableOpacity>
          </View>

          {state.wishlist.map((item) => (
            <View style={styles.card} key={item.id}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.meta}>Added: {toReadable(item.createdAt)}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => convertWishlistToPlant(item)}>
                <Text style={styles.buttonText}>Convert to owned plant</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!state.wishlist.length ? <Text style={styles.meta}>No wishlist plants yet.</Text> : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111b15',
    paddingTop: 24,
  },
  brand: {
    color: '#d5f5df',
    fontSize: 30,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  tagline: {
    color: '#8fb39a',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabButton: {
    borderWidth: 1,
    borderColor: '#2d4738',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#16251d',
  },
  tabButtonActive: {
    backgroundColor: '#2c5e43',
    borderColor: '#4b8a68',
  },
  tabButtonText: {
    color: '#d5f5df',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderColor: '#2b4336',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#16251d',
    gap: 8,
  },
  cardTitle: {
    color: '#d5f5df',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  meta: {
    color: '#aac6b3',
  },
  input: {
    borderWidth: 1,
    borderColor: '#385945',
    borderRadius: 10,
    color: '#e3fff0',
    padding: 10,
    backgroundColor: '#102017',
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#3d8f62',
    alignItems: 'center',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#305643',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#effff6',
    fontWeight: '600',
  },
  chipsRow: {
    marginVertical: 4,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#335442',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#18281f',
  },
  chipActive: {
    backgroundColor: '#2f6f4e',
  },
  chipText: {
    color: '#d5f5df',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  plantCard: {
    borderWidth: 1,
    borderColor: '#2b4336',
    borderRadius: 14,
    backgroundColor: '#16251d',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  plantImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  plantInfo: {
    flex: 1,
    gap: 3,
  },
  plantName: {
    color: '#effff6',
    fontSize: 18,
    fontWeight: '700',
  },
  smallButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#2f6f4e',
    alignItems: 'center',
  },
  tinyButton: {
    borderWidth: 1,
    borderColor: '#3d634f',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tinyButtonText: {
    color: '#b8d6c2',
    fontSize: 12,
  },
});
