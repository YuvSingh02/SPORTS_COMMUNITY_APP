// screens/NotificationsScreen.js — placeholder (implement in upcoming week)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>NotificationsScreen</Text>
    <Text style={styles.sub}>Coming soon</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center' },
  text:      { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  sub:       { color: '#546E7A', fontSize: 14, marginTop: 8 },
});

export default NotificationsScreen;
