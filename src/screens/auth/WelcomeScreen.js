// screens/auth/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>

      {/* Logo / Hero */}
      <View style={styles.hero}>
        <Text style={styles.logo}>🏏</Text>
        <Text style={styles.appName}>PitchStock</Text>
        <Text style={styles.tagline}>Buy. Sell. Win.</Text>
        <Text style={styles.description}>
          Trade cricket & football player stocks.{'\n'}
          Compete every season. Win real merchandise.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.primaryText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.legal}>Free to play · No real money · Legal under PROGA 2025</Text>

    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0A0E17', padding: 24, justifyContent: 'space-between' },
  hero:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo:            { fontSize: 72, marginBottom: 16 },
  appName:         { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  tagline:         { color: '#00E676', fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 24 },
  description:     { color: '#546E7A', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  buttons:         { gap: 12, marginBottom: 16 },
  primaryButton:   { backgroundColor: '#00E676', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText:     { color: '#000000', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#151C27', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E2A3A' },
  secondaryText:   { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  legal:           { color: '#2A3A4A', fontSize: 12, textAlign: 'center', marginBottom: 8 },
});

export default WelcomeScreen;