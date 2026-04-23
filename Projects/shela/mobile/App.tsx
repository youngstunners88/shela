// Shela Mobile App
// React Native / Expo entry point

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';

import { WalletProvider } from './context/WalletContext';
import { VerificationProvider } from './context/VerificationContext';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import InterviewScreen from './screens/InterviewScreen';
import SwipeScreen from './screens/SwipeScreen';
import StakeScreen from './screens/StakeScreen';
import CheckInScreen from './screens/CheckInScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <WalletProvider>
          <VerificationProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Interview" component={InterviewScreen} />
                <Stack.Screen name="Swipe" component={SwipeScreen} />
                <Stack.Screen name="Stake" component={StakeScreen} />
                <Stack.Screen name="CheckIn" component={CheckInScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </VerificationProvider>
        </WalletProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
