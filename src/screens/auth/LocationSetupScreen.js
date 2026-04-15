import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh',
];

const LocationSetupScreen = ({ navigation, route }) => {
  const [name, setName]                   = useState(route.params?.name || '');
  const phone                             = route.params?.phone || '';
  const [city, setCity]                   = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [referralCode, setReferralCode]   = useState('');
  const [loading, setLoading]             = useState(false);
  const [showStates, setShowStates]       = useState(false);

  const setProfile = useAuthStore((s) => s.setProfile);

  const handleComplete = async () => {
    if (!name.trim() || !city.trim() || !selectedState) {
      return Alert.alert('Error', 'Please fill in all fields');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        phone,
        city: city.trim(),
        state: selectedState,
        referral_code: referralCode.trim() || undefined,
      });

      setProfile(res.data);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Setup failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Where are you from?</Text>
        <Text style={styles.subtitle}>This helps us show your city & state leaderboard 🏆</Text>

        <TextInput style={styles.input} placeholder="Your Name" placeholderTextColor="#546E7A" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Your City" placeholderTextColor="#546E7A" value={city} onChangeText={setCity} />

        <TouchableOpacity style={styles.input} onPress={() => setShowStates(!showStates)}>
          <Text style={{ color: selectedState ? '#FFFFFF' : '#546E7A', fontSize: 15 }}>
            {selectedState || 'Select State'}
          </Text>
        </TouchableOpacity>

        {showStates && (
          <ScrollView style={styles.dropdown} nestedScrollEnabled>
            {INDIAN_STATES.map((s) => (
              <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSelectedState(s); setShowStates(false); }}>
                <Text style={styles.dropdownText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput style={styles.input} placeholder="Referral Code (optional)" placeholderTextColor="#546E7A" value={referralCode} onChangeText={setReferralCode} autoCapitalize="characters" maxLength={8} />

        <TouchableOpacity style={styles.button} onPress={handleComplete} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Let's Go! 🚀</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0A0E17' },
  inner:        { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title:        { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle:     { color: '#546E7A', fontSize: 15, marginBottom: 40 },
  input:        { backgroundColor: '#151C27', color: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#1E2A3A', justifyContent: 'center' },
  button:       { backgroundColor: '#00E676', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText:   { color: '#000000', fontSize: 16, fontWeight: '700' },
  dropdown:     { backgroundColor: '#151C27', borderRadius: 12, maxHeight: 200, marginBottom: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#1E2A3A' },
  dropdownText: { color: '#FFFFFF', fontSize: 14 },
});

export default LocationSetupScreen;