import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { styles } from '../../styles/theme';
import { toReadable } from '../../utils/dateUtils';

export default function JournalTab({ entries, plants }) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={entries}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.meta}>No journal entries yet.</Text>}
      renderItem={({ item }) => {
        const plant = plants.find((p) => p.id === item.plantId);
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
  );
}
