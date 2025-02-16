// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import FitnessScreen from './screens/FitnessScreen';

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: '#007bff',
                    tabBarInactiveTintColor: '#555',
                    headerShown: false, // Hide the header if desired
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Home' }}
                />
                <Tab.Screen
                    name="Fitness"
                    component={FitnessScreen}
                    options={{ title: 'Fitness' }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
