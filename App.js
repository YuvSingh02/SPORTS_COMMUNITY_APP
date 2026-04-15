import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/services/supabase';
import useAuthStore from './src/store/authStore';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const { setSession, fetchProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile();
    }).catch(() => setSession(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) fetchProfile();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0A0E17" />
      <RootNavigator />
    </>
  );
}