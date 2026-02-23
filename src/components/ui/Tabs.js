import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/theme';
import { TABS } from '../../constants/appConstants';

export default function Tabs({ activeTab, onChange }) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : null]}
          onPress={() => onChange(tab)}
        >
          <Text style={styles.tabButtonText}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
