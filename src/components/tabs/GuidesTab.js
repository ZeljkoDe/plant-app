import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { styles } from '../../styles/theme';

export default function GuidesTab({ guidesToShow }) {
  return (
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
  );
}
