import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../services/supabase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Please enter email and password');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return Alert.alert('Error', error.message);
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to PitchStock 🏏</Text>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#546E7A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#546E7A" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
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

export default LoginScreen;