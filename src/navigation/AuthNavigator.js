// navigation/AuthNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen   from '../screens/auth/WelcomeScreen';
import LoginScreen     from '../screens/auth/LoginScreen';
import RegisterScreen  from '../screens/auth/RegisterScreen';
import LocationSetupScreen from '../screens/auth/LocationSetupScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Welcome"       component={WelcomeScreen} />
    <Stack.Screen name="Login"         component={LoginScreen} />
    <Stack.Screen name="Register"      component={RegisterScreen} />
    <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
