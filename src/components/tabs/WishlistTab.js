import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/theme';
import { toReadable } from '../../utils/dateUtils';

export default function WishlistTab({ wishlist, wishlistInput, setWishlistInput, onAdd, onConvert }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plant wishlist</Text>
        <TextInput
          style={styles.input}
          placeholder="Dream plant"
          value={wishlistInput}
          onChangeText={setWishlistInput}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={onAdd}>
          <Text style={styles.buttonText}>Add wishlist item</Text>
        </TouchableOpacity>
      </View>

      {wishlist.map((item) => (
        <View style={styles.card} key={item.id}>
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.meta}>Added: {toReadable(item.createdAt)}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => onConvert(item)}>
            <Text style={styles.buttonText}>Convert to owned plant</Text>
          </TouchableOpacity>
        </View>
      ))}

      {!wishlist.length ? <Text style={styles.meta}>No wishlist plants yet.</Text> : null}
    </ScrollView>
  );
}
