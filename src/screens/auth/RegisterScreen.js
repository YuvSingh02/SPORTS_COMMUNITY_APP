import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../services/supabase';

const RegisterScreen = ({ navigation }) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      return Alert.alert('Error', 'Please fill all fields');
    }
    if (phone.length < 10) {
      return Alert.alert('Error', 'Enter a valid 10-digit mobile number');
    }
    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return Alert.alert('Error', error.message);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return Alert.alert('Check your email', 'Please verify your email to continue.');
      }

      navigation.navigate('LocationSetup', { name: name.trim(), phone: phone.trim(), email });
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join PitchStock 🏏</Text>

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#546E7A" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#546E7A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#546E7A" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#546E7A" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0A0E17' },
  inner:      { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title:      { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle:   { color: '#546E7A', fontSize: 16, marginBottom: 40 },
  input:      { backgroundColor: '#151C27', color: '#FFFFFF', borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  button:     { backgroundColor: '#00E676', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  link:       { color: '#546E7A', textAlign: 'center', fontSize: 14 },
  linkBold:   { color: '#00E676', fontWeight: '700' },
});

export default RegisterScreen;