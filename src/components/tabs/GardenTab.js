import React from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/theme';
import { confidenceLabel } from '../../utils/wateringModel';
import { toReadable } from '../../utils/dateUtils';

export default function GardenTab({
  dueNow,
  form,
  state,
  filteredPlants,
  selectedPlantIds,
  filterLocationId,
  setFilterLocationId,
  setForm,
  onPickImage,
  onIdentify,
  onAddPlant,
  onAddLocation,
  onBulkWater,
  onWater,
  onSnooze,
  onToggleSelect,
  onLogCare,
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart watering</Text>
        <Text style={styles.meta}>Due now: {dueNow}</Text>
        <Text style={styles.meta}>Planty learns each plant from real watering behavior.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add plant</Text>
        <TextInput
          style={styles.input}
          placeholder="Plant name"
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Species (optional)"
          value={form.species}
          onChangeText={(species) => setForm((prev) => ({ ...prev, species }))}
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
              style={[styles.chip, form.locationId === loc.id ? styles.chipActive : null]}
              onPress={() => setForm((prev) => ({ ...prev, locationId: loc.id }))}
            >
              <Text style={styles.chipText}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inlineRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onPickImage}>
            <Text style={styles.buttonText}>{form.image ? 'Change photo' : 'Pick photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onIdentify}>
            <Text style={styles.buttonText}>Identify plant</Text>
          </TouchableOpacity>
        </View>

        {form.image ? <Image source={{ uri: form.image }} style={styles.preview} /> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={onAddPlant}>
          <Text style={styles.buttonText}>Add to Garden</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Locations</Text>
        <TextInput
          style={styles.input}
          placeholder="Add location (e.g. Office shelf)"
          value={form.newLocationName}
          onChangeText={(newLocationName) => setForm((prev) => ({ ...prev, newLocationName }))}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={onAddLocation}>
          <Text style={styles.buttonText}>Add location</Text>
        </TouchableOpacity>
      </View>

      {!!selectedPlantIds.length ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onBulkWater}>
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
                <TouchableOpacity style={styles.smallButton} onPress={() => onWater(plant.id)}>
                  <Text style={styles.buttonText}>Watered</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton} onPress={() => onSnooze(plant.id)}>
                  <Text style={styles.buttonText}>Snooze</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, selectedPlantIds.includes(plant.id) ? styles.chipActive : null]}
                  onPress={() => onToggleSelect(plant.id)}
                >
                  <Text style={styles.buttonText}>Select</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inlineRow}>
                {['Repotting', 'Fertilizing', 'Pruning'].map((event) => (
                  <TouchableOpacity key={event} style={styles.tinyButton} onPress={() => onLogCare(plant.id, event)}>
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
  );
}
