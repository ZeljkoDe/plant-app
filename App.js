import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Tabs from './src/components/ui/Tabs';
import GardenTab from './src/components/tabs/GardenTab';
import JournalTab from './src/components/tabs/JournalTab';
import GuidesTab from './src/components/tabs/GuidesTab';
import WishlistTab from './src/components/tabs/WishlistTab';
import { styles } from './src/styles/theme';
import { usePlantyApp } from './src/hooks/usePlantyApp';

export default function App() {
  const {
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
    actions,
  } = usePlantyApp();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.brand}>🌿 Planty</Text>
      <Text style={styles.tagline}>Your calm, adaptive plant care companion.</Text>

      <Tabs activeTab={tab} onChange={setTab} />

      {tab === 'garden' ? (
        <GardenTab
          dueNow={dueNow}
          form={form}
          state={state}
          filteredPlants={filteredPlants}
          selectedPlantIds={selectedPlantIds}
          filterLocationId={filterLocationId}
          setFilterLocationId={setFilterLocationId}
          setForm={setForm}
          onPickImage={actions.pickImage}
          onIdentify={actions.identifySpecies}
          onAddPlant={actions.addPlant}
          onAddLocation={actions.addLocation}
          onBulkWater={actions.bulkWaterPlants}
          onWater={actions.markAsWatered}
          onSnooze={actions.snoozePlantReminder}
          onToggleSelect={actions.togglePlantSelection}
          onLogCare={actions.addJournalEntry}
        />
      ) : null}

      {tab === 'journal' ? <JournalTab entries={state.journalEntries} plants={state.plants} /> : null}
      {tab === 'guides' ? <GuidesTab guidesToShow={guidesToShow} /> : null}
      {tab === 'wishlist' ? (
        <WishlistTab
          wishlist={state.wishlist}
          wishlistInput={wishlistInput}
          setWishlistInput={setWishlistInput}
          onAdd={actions.addWishlistItem}
          onConvert={actions.convertWishlistToPlant}
        />
      ) : null}
    </SafeAreaView>
  );
}
