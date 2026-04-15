// navigation/RootNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAuthStore from '../store/authStore';
import AuthNavigator  from './AuthNavigator';
import MainNavigator  from './MainNavigator';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { isSignedIn, isLoading, profile } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isSignedIn ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !profile?.city ? (
          // Force location setup before main app
          <Stack.Screen name="LocationSetup" component={require('../screens/auth/LocationSetupScreen').default} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
